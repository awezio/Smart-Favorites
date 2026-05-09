import { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentChunkRecord } from "@/types";

const supabase = createAdminClient();

export async function insertDocumentChunks(
  payload: DocumentChunkRecord[]
): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase.from("document_chunks").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}
