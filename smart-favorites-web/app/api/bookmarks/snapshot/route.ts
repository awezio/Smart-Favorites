import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/get-user";

// Save a snapshot of the current bookmarks
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Get all bookmarks for this user
    const { data: bookmarks, error: fetchError } = await supabase
      .from("bookmarks")
      .select("id, title, url, description, description_zh, description_en, description_metadata, tags, folder_path, snapshot_url, snapshot_storage_path, snapshot_taken_at, snapshot_status, snapshot_error, snapshot_metadata, add_date, icon, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    const snapshot = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      count: bookmarks?.length || 0,
      bookmarks: bookmarks || [],
    };

    // Store in a simple JSON approach: we use a "snapshots" table
    // For now, store as a chat_session-like record or just return as downloadable JSON
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "download";

    if (mode === "download") {
      return new NextResponse(JSON.stringify(snapshot, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="bookmarks_snapshot_${
            new Date().toISOString().split("T")[0]
          }.json"`,
        },
      });
    }

    // mode === "save" - store in database as user_settings metadata
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", userId)
      .single();

    // Store last snapshot info
    const snapshotMeta = {
      saved_at: snapshot.timestamp,
      count: snapshot.count,
    };

    if (existing) {
      await supabase
        .from("user_settings")
        .update({
          // Store snapshot metadata (not the full data to avoid bloat)
          // Full snapshot is returned to client for local saving
        })
        .eq("user_id", userId);
    }

    return NextResponse.json({
      success: true,
      snapshot: snapshotMeta,
      data: snapshot,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get snapshot metadata
export async function GET() {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // For now, generate a fresh snapshot count
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({
      currentCount: count || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
