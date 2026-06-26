import type { SnapshotCardData } from "@/components/snapshot-grid";

export const SHOWCASE_SNAPSHOT_LIMIT = 12;

export function buildPublicSnapshotUrl(
  bookmarkId: string,
  snapshotTakenAt?: string | null
) {
  const base = `/api/showcase/snapshot?id=${encodeURIComponent(bookmarkId)}`;
  if (!snapshotTakenAt) return base;
  return `${base}&v=${encodeURIComponent(snapshotTakenAt)}`;
}

export function bookmarkToShowcaseItem(bookmark: {
  id: string;
  title: string;
  url: string;
  tags?: string[] | null;
  folder_path?: string | null;
  snapshot_taken_at?: string | null;
}): SnapshotCardData {
  return {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    category: categoryForBookmark(bookmark),
    snapshotUrl: buildPublicSnapshotUrl(bookmark.id, bookmark.snapshot_taken_at),
  };
}

function categoryForBookmark(bookmark: {
  tags?: string[] | null;
  folder_path?: string | null;
  url: string;
}) {
  const tag = bookmark.tags?.find(Boolean);
  if (tag) return tag;

  const folder = bookmark.folder_path
    ?.split("/")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  if (folder) return folder;

  try {
    return new URL(bookmark.url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** Static marketing placeholders when no real snapshots exist yet. */
export const defaultShowcaseItems: SnapshotCardData[] = [
  {
    id: "1",
    title: "Next.js",
    url: "https://nextjs.org",
    category: "Framework",
    snapshotUrl: null,
  },
  {
    id: "2",
    title: "Supabase",
    url: "https://supabase.com",
    category: "Database",
    snapshotUrl: null,
  },
  {
    id: "3",
    title: "Tailwind CSS",
    url: "https://tailwindcss.com",
    category: "CSS",
    snapshotUrl: null,
  },
  {
    id: "4",
    title: "Vercel",
    url: "https://vercel.com",
    category: "Hosting",
    snapshotUrl: null,
  },
  {
    id: "5",
    title: "Framer Motion",
    url: "https://www.framer.com/motion",
    category: "Animation",
    snapshotUrl: null,
  },
  {
    id: "6",
    title: "Typewolf",
    url: "https://www.typewolf.com",
    category: "Typography",
    snapshotUrl: null,
  },
];
