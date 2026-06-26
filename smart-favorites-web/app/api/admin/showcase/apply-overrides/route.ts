import { NextRequest, NextResponse, after } from "next/server";
import { listHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";
import { updateBookmark } from "@/lib/db/bookmarks";
import {
  enqueueBookmarkSnapshot,
  runQueuedBookmarkSnapshot,
} from "@/lib/snapshots/processor";
import { BOOKMARK_SNAPSHOT_IMAGE_SENTINEL } from "@/lib/showcase-merge";
import { bookmarkMatchesPattern } from "@/lib/showcase-match";

type ApplyResult = {
  overrideId: string;
  bookmarkId: string;
  title: string;
  url: string;
  snapshot_status: string;
  error?: string;
};

function findBookmarkByOverride(
  bookmarks: Array<{ id: string; title: string; url: string; user_id: string }>,
  override: {
    bookmark_id?: string | null;
    bookmark_url_match?: string | null;
  }
) {
  if (override.bookmark_id) {
    return bookmarks.find((bookmark) => bookmark.id === override.bookmark_id) || null;
  }

  const pattern = override.bookmark_url_match?.trim();
  if (!pattern) {
    return null;
  }

  return (
    bookmarks.find((bookmark) => bookmarkMatchesPattern(bookmark, pattern)) || null
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const supabase = createAdminClient();
    const overrides = (await listHomepageShowcaseItems()).filter(
      (item) => item.enabled && (item.bookmark_id || item.bookmark_url_match)
    );

    if (overrides.length === 0) {
      return NextResponse.json({ applied: [], message: "No bookmark overrides configured" });
    }

    const { data: bookmarks, error } = await supabase
      .from("bookmarks")
      .select("id, title, url, user_id")
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const applied: ApplyResult[] = [];
    const snapshotJobs: Array<{
      bookmarkId: string;
      userId: string;
      url: string;
      title: string;
    }> = [];

    for (const override of overrides) {
      const bookmark = findBookmarkByOverride(bookmarks || [], override);
      if (!bookmark) {
        applied.push({
          overrideId: override.id,
          bookmarkId: "",
          title: override.title,
          url: override.url,
          snapshot_status: "skipped",
          error: "Matching bookmark not found",
        });
        continue;
      }

      await updateBookmark(
        bookmark.id,
        {
          title: override.title,
          url: override.url,
          ...(override.image_url === BOOKMARK_SNAPSHOT_IMAGE_SENTINEL
            ? { snapshot_status: "capturing" as const, snapshot_error: null }
            : {}),
        },
        bookmark.user_id,
        supabase
      );

      if (override.image_url !== BOOKMARK_SNAPSHOT_IMAGE_SENTINEL) {
        applied.push({
          overrideId: override.id,
          bookmarkId: bookmark.id,
          title: override.title,
          url: override.url,
          snapshot_status: "static-image",
        });
        continue;
      }

      await enqueueBookmarkSnapshot(bookmark.id, bookmark.user_id, {
        source: "showcase-override",
        override_id: override.id,
      });

      snapshotJobs.push({
        bookmarkId: bookmark.id,
        userId: bookmark.user_id,
        url: override.url,
        title: override.title,
      });

      applied.push({
        overrideId: override.id,
        bookmarkId: bookmark.id,
        title: override.title,
        url: override.url,
        snapshot_status: "capturing",
      });
    }

    if (snapshotJobs.length > 0) {
      after(async () => {
        for (const job of snapshotJobs) {
          try {
            await runQueuedBookmarkSnapshot(job);
          } catch (workerError: unknown) {
            const message =
              workerError instanceof Error
                ? workerError.message
                : "Snapshot capture failed.";
            await supabase
              .from("bookmarks")
              .update({
                snapshot_status: "failed",
                snapshot_error: message,
                snapshot_taken_at: new Date().toISOString(),
              })
              .eq("id", job.bookmarkId)
              .eq("user_id", job.userId);
          }
        }
      });
    }

    return NextResponse.json({
      applied,
      queued: snapshotJobs.length,
      message:
        "Updated matching bookmarks. Live snapshot overrides were queued; static showcase images stay on bundled SVGs.",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function GET() {
  return NextResponse.json({
    sentinel: BOOKMARK_SNAPSHOT_IMAGE_SENTINEL,
    description:
      "POST to update bookmark URLs for configured overrides and queue PNG snapshots for live overrides.",
  });
}
