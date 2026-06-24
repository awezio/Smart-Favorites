import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isExtensionAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateBookmark } from "@/lib/db/bookmarks";
import {
  BOOKMARK_SNAPSHOT_BUCKET,
  captureBookmarkSnapshot,
} from "@/lib/snapshots/bookmark-snapshot";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Bookmark id is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .select("id, snapshot_storage_path")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !bookmark?.snapshot_storage_path) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data, error: downloadError } = await admin.storage
      .from(BOOKMARK_SNAPSHOT_BUCKET)
      .download(bookmark.snapshot_storage_path);

    if (downloadError || !data) {
      return NextResponse.json({ error: downloadError?.message || "Snapshot not found" }, { status: 404 });
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Snapshot download failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id || body.bookmarkId;
    if (!id) {
      return NextResponse.json({ error: "Bookmark id is required" }, { status: 400 });
    }

    const supabase = isExtensionAuthUser(user)
      ? createAdminClient()
      : await createServerSupabaseClient();
    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .select("id, title, url")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    await updateBookmark(
      id,
      {
        snapshot_status: "capturing",
        snapshot_error: null,
      },
      userId,
      supabase
    );

    const snapshot = await captureBookmarkSnapshot({
      bookmarkId: bookmark.id,
      userId,
      url: bookmark.url,
      title: bookmark.title,
    });

    const updated = await updateBookmark(id, snapshot, userId, supabase);

    return NextResponse.json({
      success: snapshot.snapshot_status === "ready",
      bookmark: updated,
      ...snapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Snapshot capture failed" },
      { status: 500 }
    );
  }
}
