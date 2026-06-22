import { NextRequest, NextResponse } from "next/server";
import { getStars, createStar, updateStar, deleteStar } from "@/lib/db/github-stars";
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
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1),
      20000
    );
    const offset = parseInt(searchParams.get("offset") || "0");

    const stars = await getStars(limit, offset, userId, supabase);

    return NextResponse.json({
      stars,
      count: stars.length,
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
    const { owner, repo, url, description, language, stars, forks, updated } = body;

    if (!owner || !repo || !url) {
      return NextResponse.json(
        { error: "Owner, repo, and URL are required" },
        { status: 400 }
      );
    }

    const textToEmbed = `${owner}/${repo} ${description || ""} ${language || ""}`;
    const embedding = await generateEmbedding(textToEmbed, { userId });
    const supabase = await createServerSupabaseClient();

    const star = await createStar({
      user_id: userId,
      owner,
      repo,
      url,
      description,
      language,
      stars: stars || 0,
      forks: forks || 0,
      updated,
      embedding,
      updated_at: new Date().toISOString(),
    }, supabase);

    return NextResponse.json({ star }, { status: 201 });
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
    const { id, owner, repo, url, description, language, stars, forks, updated } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updates: any = {};
    if (owner !== undefined) updates.owner = owner;
    if (repo !== undefined) updates.repo = repo;
    if (url !== undefined) updates.url = url;
    if (description !== undefined) updates.description = description;
    if (language !== undefined) updates.language = language;
    if (stars !== undefined) updates.stars = stars;
    if (forks !== undefined) updates.forks = forks;
    if (updated !== undefined) updates.updated = updated;

    if (owner !== undefined || repo !== undefined || description !== undefined || language !== undefined) {
      const textToEmbed = `${owner || ""}/${repo || ""} ${description || ""} ${language || ""}`;
      updates.embedding = await generateEmbedding(textToEmbed, { userId });
    }

    const supabase = await createServerSupabaseClient();
    const star = await updateStar(id, updates, userId, supabase);

    return NextResponse.json({ star });
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
      await deleteStar(id, userId, supabase);
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
