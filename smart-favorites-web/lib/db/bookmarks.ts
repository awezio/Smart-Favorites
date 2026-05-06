import { createAdminClient } from "@/lib/supabase/admin";
import { Bookmark } from "@/types";

export async function getBookmarks(
  limit: number = 50,
  offset: number = 0,
  userId?: string
): Promise<Bookmark[]> {
  const admin = createAdminClient();
  let query = admin
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Bookmark[];
}

export async function getBookmark(id: string): Promise<Bookmark | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookmarks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Bookmark;
}

export async function createBookmark(
  data: Omit<Bookmark, "id" | "created_at" | "updated_at">
): Promise<Bookmark> {
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("bookmarks")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return created as Bookmark;
}

export async function bulkInsertBookmarks(
  bookmarks: Omit<Bookmark, "id" | "created_at" | "updated_at">[]
): Promise<number> {
  if (bookmarks.length === 0) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookmarks")
    .insert(bookmarks)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function updateBookmark(
  id: string,
  updates: Partial<Omit<Bookmark, "id" | "created_at">>
): Promise<Bookmark> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookmarks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Bookmark;
}

export async function deleteBookmark(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("bookmarks").delete().eq("id", id);
  if (error) throw error;
}
