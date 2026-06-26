import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKMARK_SNAPSHOT_BUCKET } from "@/lib/snapshots/bookmark-snapshot";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Bookmark id is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: bookmark, error } = await admin
      .from("bookmarks")
      .select("id, snapshot_storage_path, snapshot_status")
      .eq("id", id)
      .eq("snapshot_status", "ready")
      .single();

    if (error || !bookmark?.snapshot_storage_path) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const { data, error: downloadError } = await admin.storage
      .from(BOOKMARK_SNAPSHOT_BUCKET)
      .download(bookmark.snapshot_storage_path);

    if (downloadError || !data) {
      return NextResponse.json(
        { error: downloadError?.message || "Snapshot not found" },
        { status: 404 }
      );
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Snapshot download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
