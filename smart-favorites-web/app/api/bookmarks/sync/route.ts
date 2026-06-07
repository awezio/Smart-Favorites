import { NextRequest, NextResponse } from "next/server";
import { parseBookmarksHtml, diffBookmarks } from "@/lib/parsers/bookmark-parser";
import { bulkInsertBookmarks, getBookmarks, updateBookmark, deleteBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";
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
    const existingBookmarks = await getBookmarks(10000, 0, userId, supabase);

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
    const addedWithEmbeddings = await Promise.all(
      diff.added.map(async (bookmark: any) => {
        const textToEmbed = `${bookmark.title} ${bookmark.description || ""} ${bookmark.url}`;
        const embedding = await generateEmbedding(textToEmbed);
        return {
          user_id: userId,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description,
          folder_path: bookmark.folder_path,
          add_date: bookmark.add_date,
          icon: bookmark.icon,
          embedding,
          updated_at: new Date().toISOString(),
        };
      })
    );

    if (addedWithEmbeddings.length > 0) {
      await bulkInsertBookmarks(addedWithEmbeddings as any, supabase);
    }

    // Process modifications
    for (const { old: oldBookmark, new: newBookmark } of diff.modified) {
      const textToEmbed = `${newBookmark.title} ${newBookmark.description || ""} ${newBookmark.url}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateBookmark(
        oldBookmark.id,
        {
          title: newBookmark.title,
          url: newBookmark.url,
          description: newBookmark.description,
          folder_path: newBookmark.folder_path,
          embedding,
        },
        userId,
        supabase
      );
    }

    // Process removals
    for (const bookmark of diff.removed) {
      await deleteBookmark(bookmark.id, userId, supabase);
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
