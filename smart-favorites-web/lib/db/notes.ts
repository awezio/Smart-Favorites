import { createAdminClient } from "@/lib/supabase/admin";
import { Note } from "@/types";

export async function getNotes(
  limit: number = 50,
  offset: number = 0,
  userId?: string
): Promise<Note[]> {
  const admin = createAdminClient();
  let query = admin
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function getNote(id: string): Promise<Note | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("notes").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as Note;
}

export async function createNote(
  data: Omit<Note, "id" | "created_at" | "updated_at">
): Promise<Note> {
  const admin = createAdminClient();
  const { data: created, error } = await admin.from("notes").insert(data).select().single();

  if (error) throw error;
  return created as Note;
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "user_id" | "created_at">>
): Promise<Note> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notes").delete().eq("id", id);
  if (error) throw error;
}
