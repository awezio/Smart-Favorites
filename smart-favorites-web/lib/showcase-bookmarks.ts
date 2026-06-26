import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";

export type ShowcaseBookmarkRow = {
  id: string;
  title: string;
  url: string;
  tags?: string[] | null;
  folder_path?: string | null;
  snapshot_taken_at?: string | null;
  snapshot_status?: string | null;
  snapshot_storage_path?: string | null;
};

const BOOKMARK_SELECT =
  "id, title, url, tags, folder_path, snapshot_taken_at, snapshot_status, snapshot_storage_path";

export async function loadShowcaseBookmarks(
  admin: SupabaseClient,
  overrides: HomepageShowcaseItem[],
  limit: number
): Promise<ShowcaseBookmarkRow[]> {
  const { data: bookmarks, error } = await admin
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .eq("snapshot_status", "ready")
    .not("snapshot_storage_path", "is", null)
    .order("snapshot_taken_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = [...(bookmarks || [])];
  const knownIds = new Set(rows.map((row) => row.id));
  const overrideIds = [
    ...new Set(
      overrides
        .map((item) => item.bookmark_id)
        .filter((id): id is string => Boolean(id) && !knownIds.has(id))
    ),
  ];

  if (overrideIds.length === 0) {
    return rows;
  }

  const { data: pinned, error: pinnedError } = await admin
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .in("id", overrideIds)
    .eq("snapshot_status", "ready")
    .not("snapshot_storage_path", "is", null);

  if (pinnedError) {
    throw pinnedError;
  }

  for (const row of pinned || []) {
    if (!knownIds.has(row.id)) {
      rows.push(row);
      knownIds.add(row.id);
    }
  }

  return rows;
}
