import { createAdminClient } from "@/lib/supabase/admin";
import type { Bookmark } from "@/types";

type SupabaseQueryClient = {
  from: ReturnType<typeof createAdminClient>["from"];
};

type BookmarkInsert = Omit<Bookmark, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

type BookmarkUpdate = Partial<Omit<Bookmark, "id" | "user_id" | "created_at">> & {
  updated_at?: string;
};

const SYNC_BOOKMARK_COLUMNS = "id, user_id, title, url, description, description_zh, description_en, description_metadata, folder_path, add_date, icon";
const DB_BATCH_SIZE = 200;
const POSTGREST_PAGE_SIZE = 1000;

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let index = 0; index < items.length; index += batchSize) {
    await handler(items.slice(index, index + batchSize));
  }
}

export async function getBookmarks(
  limit: number,
  offset: number,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<Bookmark[]> {
  const supabase = client || createAdminClient();
  const results: Bookmark[] = [];
  let remaining = limit;
  let currentOffset = offset;

  while (remaining > 0) {
    const batchSize = Math.min(POSTGREST_PAGE_SIZE, remaining);
    let query = supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false })
      .range(currentOffset, currentOffset + batchSize - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    results.push(...(data as Bookmark[]));
    remaining -= data.length;
    currentOffset += data.length;

    if (data.length < batchSize) {
      break;
    }
  }

  return results;
}

export async function getBookmarksForSync(
  userId: string,
  client?: SupabaseQueryClient
): Promise<Bookmark[]> {
  const supabase = client || createAdminClient();
  const results: Bookmark[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("bookmarks")
      .select(SYNC_BOOKMARK_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    results.push(...(data as Bookmark[]));
    if (data.length < 1000) {
      break;
    }

    offset += 1000;
  }

  return results;
}

export async function createBookmark(
  payload: BookmarkInsert,
  client?: SupabaseQueryClient
): Promise<Bookmark> {
  const supabase = client || createAdminClient();
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
  updates: BookmarkUpdate,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<Bookmark> {
  const supabase = client || createAdminClient();
  let query = supabase
    .from("bookmarks")
    .update(updates)
    .eq("id", id);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Bookmark;
}

export async function deleteBookmark(
  id: string,
  userId?: string,
  client?: SupabaseQueryClient
): Promise<void> {
  const supabase = client || createAdminClient();
  let query = supabase.from("bookmarks").delete().eq("id", id);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkInsertBookmarks(
  payload: BookmarkInsert[],
  client?: SupabaseQueryClient
): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  await runInBatches(payload, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase.from("bookmarks").insert(batch);
    if (error) {
      throw new Error(error.message);
    }
  });
}

export async function bulkUpsertBookmarks(
  payload: Array<BookmarkInsert & { id: string }>,
  client?: SupabaseQueryClient
): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  await runInBatches(payload, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase.from("bookmarks").upsert(batch);
    if (error) {
      throw new Error(error.message);
    }
  });
}

export async function bulkDeleteBookmarks(
  ids: string[],
  userId: string,
  client?: SupabaseQueryClient
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const supabase = client || createAdminClient();
  await runInBatches(ids, DB_BATCH_SIZE, async (batch) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .in("id", batch)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  });
}
