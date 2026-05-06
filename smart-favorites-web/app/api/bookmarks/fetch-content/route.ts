import { NextRequest, NextResponse } from "next/server";
import { getBookmark, updateBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";

/**
 * POST /api/bookmarks/fetch-content
 * Fetches the full text of a bookmark URL via Jina Reader and
 * updates the bookmark's description + embedding.
 *
 * Body: { id: string }  — bookmark ID
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Bookmark ID is required" }, { status: 400 });
    }

    const bookmark = await getBookmark(id);
    if (!bookmark || bookmark.user_id !== userId) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    // Fetch page content via Jina Reader
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(bookmark.url)}`;
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        Accept: "text/plain",
        "User-Agent": "SmartFavorites/1.0",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!jinaRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch content: ${jinaRes.status}` },
        { status: 502 }
      );
    }

    const rawText = await jinaRes.text();
    // Trim to a reasonable length for storage and embedding
    const description = rawText.slice(0, 1000).trim();

    if (!description) {
      return NextResponse.json({ error: "No content extracted" }, { status: 422 });
    }

    const textToEmbed = `${bookmark.title} ${description} ${bookmark.url}`;
    const embedding = await generateEmbedding(textToEmbed);

    const updated = await updateBookmark(id, { description, embedding });

    return NextResponse.json({
      success: true,
      description,
      bookmark: updated,
    });
  } catch (error: any) {
    if (error.name === "TimeoutError") {
      return NextResponse.json({ error: "Fetch timed out (20s)" }, { status: 504 });
    }
    console.error("[fetch-content]", error);
    return NextResponse.json({ error: error.message || "Fetch failed" }, { status: 500 });
  }
}
