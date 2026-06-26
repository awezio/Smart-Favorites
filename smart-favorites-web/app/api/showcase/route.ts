import { NextResponse } from "next/server";
import { listEnabledHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bookmarkToShowcaseItem,
  SHOWCASE_SNAPSHOT_LIMIT,
} from "@/lib/showcase";
import { homepageItemToSnapshotCard } from "@/lib/showcase-homepage";
import type { SnapshotCardData } from "@/components/snapshot-grid";

export async function GET() {
  try {
    try {
      const curated = await listEnabledHomepageShowcaseItems();
      if (curated.length > 0) {
        const items: SnapshotCardData[] = curated.map(homepageItemToSnapshotCard);
        return NextResponse.json({ items, source: "curated" });
      }
    } catch (curatedError) {
      console.warn("[GET /api/showcase] curated items unavailable, falling back to bookmarks", curatedError);
    }

    const admin = createAdminClient();
    const { data: bookmarks, error } = await admin
      .from("bookmarks")
      .select(
        "id, title, url, tags, folder_path, snapshot_taken_at, snapshot_status, snapshot_storage_path"
      )
      .eq("snapshot_status", "ready")
      .not("snapshot_storage_path", "is", null)
      .order("snapshot_taken_at", { ascending: false })
      .limit(SHOWCASE_SNAPSHOT_LIMIT);

    if (error) {
      throw error;
    }

    const items: SnapshotCardData[] = (bookmarks || []).map(bookmarkToShowcaseItem);
    return NextResponse.json({ items, source: "bookmarks" });
  } catch (error) {
    console.error("[GET /api/showcase]", error);
    return NextResponse.json({ items: [], source: "error" });
  }
}
