import { NextRequest, NextResponse } from "next/server";
import { getNote, updateNote, deleteNote } from "@/lib/db/notes";
import { generateEmbedding } from "@/lib/rag/embedding";
import { getAuthUser } from "@/lib/auth/get-user";
import type { Note } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const note = await getNote(id);

    if (!note || note.user_id !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getNote(id);

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, tags, source_url } = body;

    const updates: Partial<Omit<Note, "id" | "user_id" | "created_at">> = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (content !== undefined) updates.content = String(content).trim();
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (source_url !== undefined) updates.source_url = source_url ? String(source_url) : null;

    if (title !== undefined || content !== undefined) {
      const newTitle = title !== undefined ? String(title) : existing.title;
      const newContent = content !== undefined ? String(content) : existing.content;
      updates.embedding = await generateEmbedding(`${newTitle} ${newContent}`);
    }

    const note = await updateNote(id, updates);
    return NextResponse.json({ note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getNote(id);

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await deleteNote(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
