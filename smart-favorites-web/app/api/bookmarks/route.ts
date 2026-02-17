import { NextRequest, NextResponse } from "next/server";
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const bookmarks = await getBookmarks(limit, offset);

    return NextResponse.json({
      bookmarks,
      count: bookmarks.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, description, folder_path } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    // Generate embedding
    const textToEmbed = `${title} ${description || ""} ${url}`;
    const embedding = await generateEmbedding(textToEmbed);

    const bookmark = await createBookmark({
      user_id: '',  // Will be set by createBookmark
      title,
      url,
      description,
      folder_path,
      embedding,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, url, description, folder_path } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (url !== undefined) updates.url = url;
    if (description !== undefined) updates.description = description;
    if (folder_path !== undefined) updates.folder_path = folder_path;

    // Regenerate embedding if content changed
    if (title !== undefined || description !== undefined || url !== undefined) {
      const textToEmbed = `${title || ""} ${description || ""} ${url || ""}`;
      updates.embedding = await generateEmbedding(textToEmbed);
    }

    const bookmark = await updateBookmark(id, updates);

    return NextResponse.json({ bookmark });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await deleteBookmark(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
