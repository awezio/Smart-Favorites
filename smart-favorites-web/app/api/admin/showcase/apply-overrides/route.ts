import { NextRequest, NextResponse } from "next/server";
import { listHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";
import { updateBookmark } from "@/lib/db/bookmarks";
import { captureBookmarkSnapshot } from "@/lib/snapshots/bookmark-snapshot";
import { BOOKMARK_SNAPSHOT_IMAGE_SENTINEL } from "@/lib/showcase-merge";

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

  const pattern = override.bookmark_url_match?.trim().replace(/%/g, "").toLowerCase();
  if (!pattern) {
    return null;
  }

  return (
    bookmarks.find((bookmark) => {
      const haystack = `${bookmark.url} ${bookmark.title}`.toLowerCase();
      return haystack.includes(pattern);
    }) || null
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
          snapshot_status: "capturing",
          snapshot_error: null,
        },
        bookmark.user_id,
        supabase
      );

      const snapshot = await captureBookmarkSnapshot({
        bookmarkId: bookmark.id,
        userId: bookmark.user_id,
        url: override.url,
        title: override.title,
      });

      await updateBookmark(bookmark.id, snapshot, bookmark.user_id, supabase);

      applied.push({
        overrideId: override.id,
        bookmarkId: bookmark.id,
        title: override.title,
        url: override.url,
        snapshot_status: snapshot.snapshot_status,
        error: snapshot.snapshot_error || undefined,
      });
    }

    return NextResponse.json({
      applied,
      message:
        "Updated matching bookmarks and refreshed snapshots. Homepage cards keep the dither filter automatically.",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function GET() {
  return NextResponse.json({
    sentinel: BOOKMARK_SNAPSHOT_IMAGE_SENTINEL,
    description:
      "POST to update bookmark URLs for configured overrides and regenerate PNG snapshots.",
  });
}
