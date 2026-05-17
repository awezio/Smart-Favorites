import { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentRecord } from "@/types";

type DocumentInsert = Omit<
  DocumentRecord,
  "id" | "created_at" | "updated_at"
> & {
  created_at?: string;
  updated_at?: string;
};

type DocumentUpdate = Partial<Omit<DocumentRecord, "id" | "user_id" | "created_at">> & {
  updated_at?: string;
};

export async function getDocuments(
  limit: number,
  offset: number,
  userId: string
): Promise<DocumentRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return data as DocumentRecord[];
}

export async function getDocumentById(
  id: string,
  userId: string
): Promise<DocumentRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as DocumentRecord) || null;
}

export async function createDocument(
  payload: DocumentInsert
): Promise<DocumentRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DocumentRecord;
}

export async function updateDocument(
  id: string,
  userId: string,
  updates: DocumentUpdate
): Promise<DocumentRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DocumentRecord;
}

export async function deleteDocument(id: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listPendingDocuments(limit: number): Promise<DocumentRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as DocumentRecord[]) || [];
}
