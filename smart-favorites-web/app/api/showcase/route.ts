import { NextResponse } from "next/server";
import { listEnabledHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeShowcaseBookmarks } from "@/lib/showcase-merge";
import { SHOWCASE_SNAPSHOT_LIMIT } from "@/lib/showcase";
import type { SnapshotCardData } from "@/components/snapshot-grid";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";

export async function GET() {
  try {
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

    let overrides: HomepageShowcaseItem[] = [];
    try {
      overrides = await listEnabledHomepageShowcaseItems();
    } catch (curatedError) {
      console.warn("[GET /api/showcase] overrides unavailable", curatedError);
    }

    const items: SnapshotCardData[] = mergeShowcaseBookmarks(bookmarks || [], overrides);
    return NextResponse.json({
      items,
      source: overrides.length > 0 ? "bookmarks+overrides" : "bookmarks",
    });
  } catch (error) {
    console.error("[GET /api/showcase]", error);
    return NextResponse.json({ items: [], source: "error" });
  }
}
