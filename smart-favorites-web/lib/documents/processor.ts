import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteDocumentChunks, insertDocumentChunks } from "@/lib/db/document-chunks";
import { listDocumentsForProcessing, updateDocument } from "@/lib/db/documents";
import { parseDocument } from "@/lib/file-parsers";
import { generateEmbeddings } from "@/lib/rag/embedding";

type ProcessDocumentsOptions = {
  limit: number;
  userId?: string;
  documentId?: string;
};

export type DocumentProcessResult = {
  id: string;
  status: "completed" | "failed";
  chunks?: number;
  error?: string;
};

export async function processDocuments({
  limit,
  userId,
  documentId,
}: ProcessDocumentsOptions): Promise<DocumentProcessResult[]> {
  const documents = await listDocumentsForProcessing({ limit, userId, documentId });
  const supabase = createAdminClient();
  const results: DocumentProcessResult[] = [];

  for (const document of documents) {
    try {
      if (!document.storage_path) {
        throw new Error("Missing storage path");
      }

      await updateDocument(document.id, document.user_id, {
        status: "processing",
        processing_error: null,
      });

      const file = await supabase.storage
        .from("documents")
        .download(document.storage_path);

      if (file.error || !file.data) {
        throw new Error(file.error?.message || "Failed to download document");
      }

      const parsed = await parseDocument(
        file.data,
        document.file_type || "",
        document.file_name
      );

      const embeddings = await generateEmbeddings(
        parsed.chunks.map((chunk) => chunk.content),
        { userId: document.user_id }
      );

      const chunkRecords = parsed.chunks.map((chunk, index) => ({
        document_id: document.id,
        user_id: document.user_id,
        content: chunk.content,
        content_hash: createHash("sha256").update(chunk.content).digest("hex"),
        chunk_index: chunk.chunk_index,
        page_number: chunk.page_number || null,
        section_title: chunk.section_title || null,
        char_start_pos: chunk.char_start_pos,
        char_end_pos: chunk.char_end_pos,
        embedding: embeddings[index] || [],
        char_count: chunk.content.length,
        estimated_token_count: chunk.estimated_token_count,
        created_at: new Date().toISOString(),
      }));

      await deleteDocumentChunks(document.id, document.user_id);
      await insertDocumentChunks(chunkRecords);
      await updateDocument(document.id, document.user_id, {
        status: "completed",
        processing_error: null,
        metadata: {
          ...(document.metadata || {}),
          processed_at: new Date().toISOString(),
          chunk_count: chunkRecords.length,
        },
      });

      results.push({
        id: document.id,
        status: "completed",
        chunks: chunkRecords.length,
      });
    } catch (error: any) {
      await updateDocument(document.id, document.user_id, {
        status: "failed",
        processing_error: error.message || "Processing failed",
      });

      results.push({
        id: document.id,
        status: "failed",
        error: error.message || "Processing failed",
      });
    }
  }

  return results;
}
