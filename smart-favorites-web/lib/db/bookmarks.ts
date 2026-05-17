import { createAdminClient } from "@/lib/supabase/admin";
import type { Bookmark } from "@/types";

type BookmarkInsert = Omit<Bookmark, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

type BookmarkUpdate = Partial<Omit<Bookmark, "id" | "user_id" | "created_at">> & {
  updated_at?: string;
};

export async function getBookmarks(
  limit: number,
  offset: number,
  userId?: string
): Promise<Bookmark[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data as Bookmark[];
}

export async function createBookmark(payload: BookmarkInsert): Promise<Bookmark> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Bookmark;
}

export async function updateBookmark(
  id: string,
  updates: BookmarkUpdate
): Promise<Bookmark> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Bookmark;
}

export async function deleteBookmark(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bookmarks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkInsertBookmarks(payload: BookmarkInsert[]): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("bookmarks").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}
