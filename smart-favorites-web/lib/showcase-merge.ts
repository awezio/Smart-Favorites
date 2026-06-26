import type { SnapshotCardData } from "@/components/snapshot-grid";
import { bookmarkToShowcaseItem, buildPublicSnapshotUrl, toPublicShowcaseSnapshotUrl } from "@/lib/showcase";
import type { ShowcaseBookmarkRow } from "@/lib/showcase-bookmarks";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";
import { bookmarkMatchesPattern } from "@/lib/showcase-match";

export const BOOKMARK_SNAPSHOT_IMAGE_SENTINEL = "__bookmark_snapshot__";

const SHOWCASE_STATIC_FALLBACKS: Record<string, string> = {
  "awwwards.com": "/images/showcase/awwwards.svg",
  "www.awwwards.com": "/images/showcase/awwwards.svg",
  "httpster.net": "/images/showcase/httpster.svg",
  "www.httpster.net": "/images/showcase/httpster.svg",
};

type BookmarkRow = ShowcaseBookmarkRow;

export function mergeShowcaseBookmarks(
  bookmarks: BookmarkRow[],
  overrides: HomepageShowcaseItem[]
): SnapshotCardData[] {
  const items = bookmarks.map(bookmarkToShowcaseItem);

  const sortedOverrides = [...overrides]
    .filter((item) => item.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const override of sortedOverrides) {
    const index = findOverrideTargetIndex(items, bookmarks, override);
    if (index < 0) {
      continue;
    }

    const bookmark = bookmarks[index];
    const snapshotUrl = resolveOverrideSnapshotUrl(override, bookmark, bookmarks);
    items[index] = {
      id: bookmark.id,
      title: override.title,
      url: override.url,
      category: override.category || items[index].category,
      snapshotUrl,
    };
  }

  return items;
}

function findOverrideTargetIndex(
  items: SnapshotCardData[],
  bookmarks: BookmarkRow[],
  override: HomepageShowcaseItem
): number {
  if (override.bookmark_id) {
    const byId = items.findIndex((item) => item.id === override.bookmark_id);
    if (byId >= 0) {
      return byId;
    }
  }

  const pattern = override.bookmark_url_match?.trim();
  if (pattern) {
    const byPattern = bookmarks.findIndex((bookmark) =>
      bookmarkMatchesPattern(bookmark, pattern)
    );
    if (byPattern >= 0) {
      return byPattern;
    }
  }

  return -1;
}

function resolveOverrideSnapshotUrl(
  override: HomepageShowcaseItem,
  bookmark: BookmarkRow,
  bookmarks: BookmarkRow[]
): string | null | undefined {
  const imageUrl = override.image_url?.trim();
  if (!imageUrl || imageUrl === BOOKMARK_SNAPSHOT_IMAGE_SENTINEL) {
    const bookmarkId = override.bookmark_id || bookmark.id;
    const source = bookmarks.find((row) => row.id === bookmarkId) || bookmark;
    if (source.snapshot_status === "ready") {
      return buildPublicSnapshotUrl(bookmarkId, source.snapshot_taken_at);
    }
    return resolveShowcaseStaticFallback(override.url);
  }
  return toPublicShowcaseSnapshotUrl(imageUrl);
}

function resolveShowcaseStaticFallback(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SHOWCASE_STATIC_FALLBACKS[hostname] || null;
  } catch {
    return null;
  }
}

export function normalizeBookmarkUrlMatch(value: string): string {
  return value.trim();
}
