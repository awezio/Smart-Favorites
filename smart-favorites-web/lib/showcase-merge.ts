import type { SnapshotCardData } from "@/components/snapshot-grid";
import { bookmarkToShowcaseItem, buildPublicSnapshotUrl } from "@/lib/showcase";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";
import { bookmarkMatchesPattern } from "@/lib/showcase-match";

export const BOOKMARK_SNAPSHOT_IMAGE_SENTINEL = "__bookmark_snapshot__";

type BookmarkRow = Parameters<typeof bookmarkToShowcaseItem>[0];

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
    const snapshotUrl = resolveOverrideSnapshotUrl(override, bookmark);
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
    return items.findIndex((item) => item.id === override.bookmark_id);
  }

  const pattern = override.bookmark_url_match?.trim();
  if (!pattern) {
    return -1;
  }

  return bookmarks.findIndex((bookmark) => bookmarkMatchesPattern(bookmark, pattern));
}

function resolveOverrideSnapshotUrl(
  override: HomepageShowcaseItem,
  bookmark: BookmarkRow
): string | null | undefined {
  const imageUrl = override.image_url?.trim();
  if (!imageUrl || imageUrl === BOOKMARK_SNAPSHOT_IMAGE_SENTINEL) {
    return buildPublicSnapshotUrl(bookmark.id, bookmark.snapshot_taken_at);
  }
  return imageUrl;
}

export function normalizeBookmarkUrlMatch(value: string): string {
  return value.trim();
}
