import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { updateBookmark } from "@/lib/db/bookmarks";
import {
  captureBookmarkSnapshot,
  type BookmarkSnapshotResult,
} from "@/lib/snapshots/bookmark-snapshot";

const DEFAULT_BATCH_LIMIT = 3;
const STALE_CAPTURING_MS = 10 * 60 * 1000;

export type SnapshotBookmarkRow = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  snapshot_status: string | null;
  updated_at: string;
};

export type SnapshotProcessResult = {
  id: string;
  status: BookmarkSnapshotResult["snapshot_status"];
  error?: string | null;
};

export async function enqueueBookmarkSnapshot(
  bookmarkId: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createAdminClient();
  return updateBookmark(
    bookmarkId,
    {
      snapshot_status: "capturing",
      snapshot_error: null,
      snapshot_metadata: {
        requested_at: new Date().toISOString(),
        queue: "bookmark_snapshots",
        ...metadata,
      },
    },
    userId,
    supabase
  );
}

export async function listBookmarksForSnapshotProcessing({
  limit = DEFAULT_BATCH_LIMIT,
  bookmarkId,
  userId,
}: {
  limit?: number;
  bookmarkId?: string;
  userId?: string;
}): Promise<SnapshotBookmarkRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("bookmarks")
    .select("id, user_id, title, url, snapshot_status, updated_at")
    .in("snapshot_status", ["pending", "capturing"])
    .order("updated_at", { ascending: true });

  if (bookmarkId) {
    query = query.eq("id", bookmarkId);
  }
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.limit(Math.max(limit * 3, limit));
  if (error) {
    throw new Error(error.message);
  }

  const now = Date.now();
  const eligible = (data || []).filter((row) =>
    isEligibleSnapshotJob(row as SnapshotBookmarkRow, now)
  );

  return eligible.slice(0, limit) as SnapshotBookmarkRow[];
}

export function isEligibleSnapshotJob(
  bookmark: SnapshotBookmarkRow,
  now = Date.now()
): boolean {
  if (bookmark.snapshot_status === "pending") {
    return true;
  }
  if (bookmark.snapshot_status !== "capturing") {
    return false;
  }
  const updatedAt = Date.parse(bookmark.updated_at);
  if (!Number.isFinite(updatedAt)) {
    return true;
  }
  return now - updatedAt >= STALE_CAPTURING_MS;
}

export async function processBookmarkSnapshotJob(
  bookmark: SnapshotBookmarkRow
): Promise<SnapshotProcessResult> {
  const supabase = createAdminClient();

  await updateBookmark(
    bookmark.id,
    {
      snapshot_status: "capturing",
      snapshot_error: null,
    },
    bookmark.user_id,
    supabase
  );

  const snapshot = await captureBookmarkSnapshot({
    bookmarkId: bookmark.id,
    userId: bookmark.user_id,
    url: bookmark.url,
    title: bookmark.title,
  });

  await updateBookmark(bookmark.id, snapshot, bookmark.user_id, supabase);

  return {
    id: bookmark.id,
    status: snapshot.snapshot_status,
    error: snapshot.snapshot_error,
  };
}

export async function processBookmarkSnapshots({
  limit = DEFAULT_BATCH_LIMIT,
  bookmarkId,
  userId,
}: {
  limit?: number;
  bookmarkId?: string;
  userId?: string;
} = {}): Promise<SnapshotProcessResult[]> {
  const bookmarks = await listBookmarksForSnapshotProcessing({
    limit,
    bookmarkId,
    userId,
  });
  const results: SnapshotProcessResult[] = [];

  for (const bookmark of bookmarks) {
    try {
      results.push(await processBookmarkSnapshotJob(bookmark));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Snapshot capture failed.";
      await updateBookmark(
        bookmark.id,
        {
          snapshot_status: "failed",
          snapshot_error: message,
          snapshot_taken_at: new Date().toISOString(),
        },
        bookmark.user_id,
        createAdminClient()
      );
      results.push({
        id: bookmark.id,
        status: "failed",
        error: message,
      });
    }
  }

  return results;
}

export async function runQueuedBookmarkSnapshot({
  bookmarkId,
  userId,
  url,
  title,
}: {
  bookmarkId: string;
  userId: string;
  url: string;
  title?: string;
}): Promise<BookmarkSnapshotResult> {
  const supabase = createAdminClient();
  const snapshot = await captureBookmarkSnapshot({
    bookmarkId,
    userId,
    url,
    title,
  });
  await updateBookmark(bookmarkId, snapshot, userId, supabase);
  return snapshot;
}
