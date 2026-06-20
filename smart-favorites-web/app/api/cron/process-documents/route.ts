import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPendingDocuments, updateDocument } from "@/lib/db/documents";
import { insertDocumentChunks } from "@/lib/db/document-chunks";
import { parseDocument } from "@/lib/file-parsers";
import { generateEmbeddings } from "@/lib/rag/embedding";
import { createHash } from "crypto";

const DEFAULT_BATCH_LIMIT = 5;

export async function GET(request: NextRequest) {
  try {
    enforceCronAuth(request);

    const limitParam = request.nextUrl.searchParams.get("limit") || "";
    const limit = Number.isFinite(Number(limitParam)) && Number(limitParam) > 0
      ? Number(limitParam)
      : DEFAULT_BATCH_LIMIT;
    const documents = await listPendingDocuments(limit);
    const supabase = createAdminClient();

    const results = [] as Array<{ id: string; status: string; error?: string }>;

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

        await insertDocumentChunks(chunkRecords);
        await updateDocument(document.id, document.user_id, {
          status: "completed",
          processing_error: null,
        });

        results.push({ id: document.id, status: "completed" });
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

    return NextResponse.json({ processed: results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cron processing failed" },
      { status: 500 }
    );
  }
}

function enforceCronAuth(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");

  if (!token || token !== secret) {
    throw new Error("Unauthorized cron request");
  }
}
