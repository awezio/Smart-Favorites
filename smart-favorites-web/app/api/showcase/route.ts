import { NextResponse } from "next/server";
import { listEnabledHomepageShowcaseItems } from "@/lib/admin/homepage-showcase";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadShowcaseBookmarks } from "@/lib/showcase-bookmarks";
import { mergeShowcaseBookmarks } from "@/lib/showcase-merge";
import { SHOWCASE_SNAPSHOT_LIMIT } from "@/lib/showcase";
import type { HomepageShowcaseItem } from "@/lib/showcase-homepage";

export async function GET() {
  try {
    const admin = createAdminClient();

    let overrides: HomepageShowcaseItem[] = [];
    try {
      overrides = await listEnabledHomepageShowcaseItems();
    } catch (curatedError) {
      console.warn("[GET /api/showcase] overrides unavailable", curatedError);
    }

    const bookmarks = await loadShowcaseBookmarks(
      admin,
      overrides,
      SHOWCASE_SNAPSHOT_LIMIT
    );

    const items = mergeShowcaseBookmarks(bookmarks, overrides);
    return NextResponse.json({
      items,
      source: overrides.length > 0 ? "bookmarks+overrides" : "bookmarks",
    });
  } catch (error) {
    console.error("[GET /api/showcase]", error);
    return NextResponse.json({ items: [], source: "error" });
  }
}
