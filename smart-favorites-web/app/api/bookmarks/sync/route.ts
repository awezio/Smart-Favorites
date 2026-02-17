import { NextRequest, NextResponse } from "next/server";
import { parseBookmarksHtml, diffBookmarks } from "@/lib/parsers/bookmark-parser";
import { bulkInsertBookmarks, getBookmarks, updateBookmark, deleteBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";

export async function POST(request: NextRequest) {
  try {
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

    // Get existing bookmarks
    const existingBookmarks = await getBookmarks(10000);

    // Convert parsed bookmarks to Bookmark format for diff
    const newBookmarks = parsedBookmarks.map(pb => ({
      id: '',  // Will be generated
      user_id: '',  // Will be set
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
          user_id: '',
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
      await bulkInsertBookmarks(addedWithEmbeddings as any);
    }

    // Process modifications
    for (const { old: oldBookmark, new: newBookmark } of diff.modified) {
      const textToEmbed = `${newBookmark.title} ${newBookmark.description || ""} ${newBookmark.url}`;
      const embedding = await generateEmbedding(textToEmbed);

      await updateBookmark(oldBookmark.id, {
        title: newBookmark.title,
        url: newBookmark.url,
        description: newBookmark.description,
        folder_path: newBookmark.folder_path,
        embedding,
      });
    }

    // Process removals
    for (const bookmark of diff.removed) {
      await deleteBookmark(bookmark.id);
    }

    return NextResponse.json({
      success: true,
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
