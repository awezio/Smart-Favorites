import "server-only";

import {
  generateBookmarkDescription,
  structuredDescriptionToRagText,
} from "@/lib/ai/description-generator";
import { updateBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  enqueueBookmarkSnapshot,
  runQueuedBookmarkSnapshot,
  type SnapshotProcessResult,
} from "@/lib/snapshots/processor";

export type DescribeBookmarkItem = {
  id: string;
  url: string;
  title: string;
};

export type DescribeBookmarkSnapshotMode = "async" | "sync" | "skip";

export type DescribeBookmarkOptions = {
  userId: string;
  item: DescribeBookmarkItem;
  snapshotMode?: DescribeBookmarkSnapshotMode;
};

export type DescribeBookmarkResult = {
  description: string;
  description_zh: string;
  description_en: string;
  description_metadata: Record<string, unknown>;
  structured_description: Record<string, unknown>;
  snapshot_url: string | null;
  snapshot_status: string | null;
  snapshot_error: string | null;
  snapshot_queued: boolean;
  snapshot_completed: boolean;
  asyncSnapshotJob?: DescribeBookmarkItem & { userId: string };
};

export async function describeBookmark({
  userId,
  item,
  snapshotMode = "async",
}: DescribeBookmarkOptions): Promise<DescribeBookmarkResult> {
  const supabase = await createServerSupabaseClient();
  const generated = await generateBookmarkDescription(item.url, item.title, {
    userId,
  });

  const structuredText = structuredDescriptionToRagText(
    generated.structured_description
  );
  const textToEmbed = `${item.title} ${generated.description_zh} ${generated.description_en} ${structuredText} ${item.url}`;
  const embedding = await generateEmbedding(textToEmbed, { userId });

  await updateBookmark(
    item.id,
    {
      description: generated.description_zh,
      description_zh: generated.description_zh,
      description_en: generated.description_en,
      description_metadata: generated.description_metadata,
      embedding,
    },
    userId,
    supabase
  );

  let snapshotResult: SnapshotProcessResult | null = null;
  let snapshotQueued = false;

  if (snapshotMode === "async") {
    await enqueueBookmarkSnapshot(item.id, userId, {
      source: "ai-describe",
      delivery: "async",
    });
    snapshotQueued = true;
  } else if (snapshotMode === "sync") {
    await enqueueBookmarkSnapshot(item.id, userId, {
      source: "ai-describe",
      delivery: "sync",
    });
    snapshotQueued = true;
    try {
      const snapshot = await runQueuedBookmarkSnapshot({
        bookmarkId: item.id,
        userId,
        url: item.url,
        title: item.title,
      });
      snapshotResult = {
        id: item.id,
        status: snapshot.snapshot_status,
        error: snapshot.snapshot_error,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Snapshot capture failed.";
      snapshotResult = {
        id: item.id,
        status: "failed",
        error: message,
      };
    }
  }

  return {
    description: generated.description_zh,
    description_zh: generated.description_zh,
    description_en: generated.description_en,
    description_metadata: generated.description_metadata,
    structured_description: (generated.structured_description ||
      {}) as Record<string, unknown>,
    snapshot_url:
      snapshotResult?.status === "ready"
        ? `/api/bookmarks/snapshot-page?id=${encodeURIComponent(item.id)}`
        : null,
    snapshot_status:
      snapshotResult?.status ||
      (snapshotMode === "skip" ? null : "capturing"),
    snapshot_error: snapshotResult?.error || null,
    snapshot_queued: snapshotQueued,
    snapshot_completed: snapshotResult?.status === "ready",
    asyncSnapshotJob:
      snapshotMode === "async" ? { ...item, userId } : undefined,
  };
}

export function resolveDescribeSnapshotMode(input: {
  runSnapshotInline?: boolean | "sync";
  snapshotMode?: DescribeBookmarkSnapshotMode;
  batch?: boolean;
}): DescribeBookmarkSnapshotMode {
  if (input.snapshotMode) {
    return input.snapshotMode;
  }
  if (input.runSnapshotInline === "sync" || input.batch) {
    return "sync";
  }
  if (input.runSnapshotInline === false) {
    return "skip";
  }
  return "async";
}
