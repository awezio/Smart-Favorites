import { NextRequest, NextResponse } from "next/server";
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const bookmarks = await getBookmarks(limit, offset, userId, supabase);

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
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { title, url, description, folder_path } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const textToEmbed = `${title} ${description || ""} ${url}`;
    const embedding = await generateEmbedding(textToEmbed);
    const supabase = await createServerSupabaseClient();

    const bookmark = await createBookmark({
      user_id: userId,
      title,
      url,
      description,
      folder_path,
      embedding,
      updated_at: new Date().toISOString(),
    }, supabase);

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

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

    if (title !== undefined || description !== undefined || url !== undefined) {
      const textToEmbed = `${title || ""} ${description || ""} ${url || ""}`;
      updates.embedding = await generateEmbedding(textToEmbed);
    }

    const supabase = await createServerSupabaseClient();
    const bookmark = await updateBookmark(id, updates, userId, supabase);

    return NextResponse.json({ bookmark });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Support batch delete via body or single via query param
    const searchParams = request.nextUrl.searchParams;
    const singleId = searchParams.get("id");

    let ids: string[] = [];
    if (singleId) {
      ids = [singleId];
    } else {
      try {
        const body = await request.json();
        ids = body.ids || [];
      } catch {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "At least one ID is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    for (const id of ids) {
      await deleteBookmark(id, userId, supabase);
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
