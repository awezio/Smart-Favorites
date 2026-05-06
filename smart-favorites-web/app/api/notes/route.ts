import { NextRequest, NextResponse } from "next/server";
import { getNotes, createNote } from "@/lib/db/notes";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notes = await getNotes(limit, offset, userId);
    return NextResponse.json({ notes, count: notes.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, tags = [], source_url } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const textToEmbed = `${title} ${content}`;
    const embedding = await generateEmbedding(textToEmbed);

    const note = await createNote({
      user_id: userId,
      title: title.trim(),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      source_url: source_url || null,
      embedding,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
