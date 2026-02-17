import { NextRequest, NextResponse } from "next/server";
import { getStars, createStar, updateStar, deleteStar } from "@/lib/db/github-stars";
import { generateEmbedding } from "@/lib/rag/embedding";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const stars = await getStars(limit, offset);

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
    const body = await request.json();
    const { owner, repo, url, description, language, stars, forks, updated } = body;

    if (!owner || !repo || !url) {
      return NextResponse.json(
        { error: "Owner, repo, and URL are required" },
        { status: 400 }
      );
    }

    // Generate embedding
    const textToEmbed = `${owner}/${repo} ${description || ""} ${language || ""}`;
    const embedding = await generateEmbedding(textToEmbed);

    const star = await createStar({
      user_id: '',  // Will be set by createStar
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
    });

    return NextResponse.json({ star }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    // Regenerate embedding if content changed
    if (owner !== undefined || repo !== undefined || description !== undefined || language !== undefined) {
      const textToEmbed = `${owner || ""}/${repo || ""} ${description || ""} ${language || ""}`;
      updates.embedding = await generateEmbedding(textToEmbed);
    }

    const star = await updateStar(id, updates);

    return NextResponse.json({ star });
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

    await deleteStar(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
