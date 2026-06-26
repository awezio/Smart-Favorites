import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bookmarkToShowcaseItem,
  SHOWCASE_SNAPSHOT_LIMIT,
} from "@/lib/showcase";
import type { SnapshotCardData } from "@/components/snapshot-grid";

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

    const items: SnapshotCardData[] = (bookmarks || []).map(bookmarkToShowcaseItem);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/showcase]", error);
    return NextResponse.json({ items: [] });
  }
}
