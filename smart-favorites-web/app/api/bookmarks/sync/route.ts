import { NextRequest, NextResponse } from "next/server";
import { parseBookmarksHtml, diffBookmarks } from "@/lib/parsers/bookmark-parser";
import { bulkInsertBookmarks, bulkUpsertBookmarks, bulkDeleteBookmarks, getBookmarksForSync } from "@/lib/db/bookmarks";
import { getAuthUser, isExtensionAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function tagsFromFolderPath(folderPath?: string | null) {
  return (folderPath || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

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
      tags: tagsFromFolderPath(pb.folder_path),
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
      tags: bookmark.tags?.length ? bookmark.tags : tagsFromFolderPath(bookmark.folder_path),
      folder_path: bookmark.folder_path,
      add_date: bookmark.add_date,
      icon: bookmark.icon,
      updated_at: new Date().toISOString(),
    }));

    if (addedBookmarks.length > 0) {
      await bulkInsertBookmarks(addedBookmarks as any, supabase);
    }

    if (diff.modified.length > 0) {
      const modifiedBookmarks = diff.modified.map(({ old: oldBookmark, new: newBookmark }) => ({
        id: oldBookmark.id,
        user_id: userId,
        title: newBookmark.title,
        url: newBookmark.url,
        description: newBookmark.description,
        tags: Array.isArray(oldBookmark.tags) ? oldBookmark.tags : [],
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
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
