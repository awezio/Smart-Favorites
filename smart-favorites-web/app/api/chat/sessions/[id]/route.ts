import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient, getAuthUser } from "@/lib/auth/get-user";
import { syncSessionSourcesFromMessages } from "@/lib/chat/session-sources-db";
import type { ChatMessage } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createAuthenticatedSupabaseClient(user);

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, messages, is_pinned, is_archived, title_status } = body;

    const supabase = await createAuthenticatedSupabaseClient(user);

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (messages !== undefined) updates.messages = messages;
    if (is_pinned !== undefined) updates.is_pinned = Boolean(is_pinned);
    if (is_archived !== undefined) updates.is_archived = Boolean(is_archived);
    if (title_status !== undefined) updates.title_status = title_status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    if (messages !== undefined && Array.isArray(messages)) {
      await syncSessionSourcesFromMessages(
        supabase,
        id,
        userId,
        messages as ChatMessage[]
      );
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createAuthenticatedSupabaseClient(user);

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
