import { NextRequest, NextResponse } from "next/server";
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark } from "@/lib/db/bookmarks";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,，、\n]/)
      : [];

  return Array.from(
    new Set(
      raw
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .slice(0, 24)
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1),
      20000
    );
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
    const { title, url, description, description_zh, description_en, folder_path } = body;
    const tags = normalizeTags(body.tags);
    const descriptionZh = normalizeOptionalString(description_zh) || normalizeOptionalString(description);
    const descriptionEn = normalizeOptionalString(description_en);

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 }
      );
    }

    const textToEmbed = `${title} ${descriptionZh || ""} ${descriptionEn || ""} ${tags.join(" ")} ${url}`;
    const embedding = await generateEmbedding(textToEmbed, { userId });
    const supabase = await createServerSupabaseClient();

    const bookmark = await createBookmark({
      user_id: userId,
      title,
      url,
      description: descriptionZh,
      description_zh: descriptionZh,
      description_en: descriptionEn,
      tags,
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
    const { id, title, url, description, description_zh, description_en, folder_path } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (url !== undefined) updates.url = url;
    if (description !== undefined || description_zh !== undefined) {
      updates.description = normalizeOptionalString(description_zh) || normalizeOptionalString(description) || "";
      updates.description_zh = updates.description;
    }
    if (description_en !== undefined) {
      updates.description_en = normalizeOptionalString(description_en) || "";
    }
    if (body.tags !== undefined) updates.tags = normalizeTags(body.tags);
    if (folder_path !== undefined) updates.folder_path = folder_path;

    if (
      title !== undefined ||
      description !== undefined ||
      description_zh !== undefined ||
      description_en !== undefined ||
      body.tags !== undefined ||
      url !== undefined
    ) {
      const textToEmbed = [
        title || "",
        updates.description || "",
        updates.description_en || "",
        Array.isArray(updates.tags) ? updates.tags.join(" ") : "",
        url || "",
      ].join(" ");
      updates.embedding = await generateEmbedding(textToEmbed, { userId });
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
