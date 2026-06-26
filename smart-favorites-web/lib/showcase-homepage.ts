import type { SnapshotCardData } from "@/components/snapshot-grid";

export interface HomepageShowcaseItem {
  id: string;
  title: string;
  url: string;
  image_url: string;
  category?: string | null;
  sort_order: number;
  enabled: boolean;
  bookmark_id?: string | null;
  bookmark_url_match?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function homepageItemToSnapshotCard(item: HomepageShowcaseItem): SnapshotCardData {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    category: item.category || undefined,
    snapshotUrl: item.image_url,
  };
}

export function normalizeShowcaseImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}

export function isValidShowcaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
