import { NextRequest, NextResponse } from "next/server";
import { parseBookmarksHtml, diffBookmarks } from "@/lib/parsers/bookmark-parser";
import { bulkInsertBookmarks, bulkUpsertBookmarks, bulkDeleteBookmarks, getBookmarksForSync } from "@/lib/db/bookmarks";
import { getAuthUser, isExtensionAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { htmlContent } = body;

    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    // Parse HTML
    const parsedBookmarks = parseBookmarksHtml(htmlContent);
    const supabase = isExtensionAuthUser(user)
      ? createAdminClient()
      : await createServerSupabaseClient();

    // Get existing bookmarks for this user
    const existingBookmarks = await getBookmarksForSync(userId, supabase);

    // Convert parsed bookmarks to Bookmark format for diff
    const newBookmarks = parsedBookmarks.map(pb => ({
      id: '',
      user_id: userId,
      title: pb.title,
      url: pb.url,
      description: '',
      folder_path: pb.folder_path,
      add_date: pb.add_date,
      icon: pb.icon,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Perform diff
    const diff = diffBookmarks(existingBookmarks, newBookmarks);

    // Process additions
    const addedBookmarks = diff.added.map((bookmark: any) => ({
      user_id: userId,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      folder_path: bookmark.folder_path,
      add_date: bookmark.add_date,
      icon: bookmark.icon,
      updated_at: new Date().toISOString(),
    }));

    if (addedBookmarks.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7392/ingest/f8b1936f-fed7-4572-ac24-448b5672c1e9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d21e4d'},body:JSON.stringify({sessionId:'d21e4d',location:'bookmarks/sync/route.ts:bulkInsert',message:'bookmark sync insert sample',data:{count:addedBookmarks.length,sampleAddDates:addedBookmarks.slice(0,3).map((b)=>b.add_date)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      await bulkInsertBookmarks(addedBookmarks as any, supabase);
    }

    if (diff.modified.length > 0) {
      const modifiedBookmarks = diff.modified.map(({ old: oldBookmark, new: newBookmark }) => ({
        id: oldBookmark.id,
        user_id: userId,
        title: newBookmark.title,
        url: newBookmark.url,
        description: newBookmark.description,
        folder_path: newBookmark.folder_path,
        add_date: newBookmark.add_date,
        icon: newBookmark.icon,
        updated_at: new Date().toISOString(),
      }));
      await bulkUpsertBookmarks(modifiedBookmarks as any, supabase);
    }

    if (diff.removed.length > 0) {
      await bulkDeleteBookmarks(
        diff.removed.map((bookmark) => bookmark.id),
        userId,
        supabase
      );
    }

    const totalImported = diff.added.length + diff.modified.length;
    return NextResponse.json({
      success: true,
      total_bookmarks: parsedBookmarks.length,
      total_imported: totalImported,
      summary: {
        added: diff.added.length,
        modified: diff.modified.length,
        removed: diff.removed.length,
        unchanged: diff.unchanged_count,
      },
    });
  } catch (error: any) {
    console.error("Bookmark sync error:", error);
    // #region agent log
    fetch('http://127.0.0.1:7392/ingest/f8b1936f-fed7-4572-ac24-448b5672c1e9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d21e4d'},body:JSON.stringify({sessionId:'d21e4d',location:'bookmarks/sync/route.ts:catch',message:'bookmark sync error',data:{errorMessage:error?.message||String(error)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
