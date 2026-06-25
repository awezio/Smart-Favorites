import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { aggregateSessionSources } from "@/lib/chat/session-sources";
import { loadSessionSourcesFromDb } from "@/lib/chat/session-sources-db";
import type { ChatMessage } from "@/types";

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
    const typeFilter = request.nextUrl.searchParams.get("type");
    const supabase = await createServerSupabaseClient();

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("id, title, messages")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = normalizeMessages(session.messages);
    const dbSources = await loadSessionSourcesFromDb(supabase, id, userId);
    let sources = dbSources || aggregateSessionSources(messages);
    if (typeFilter === "bookmark" || typeFilter === "star" || typeFilter === "document") {
      sources = sources.filter((source) => source.type === typeFilter);
    }

    return NextResponse.json({
      sessionId: session.id,
      sessionTitle: session.title,
      count: sources.length,
      sources,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message === "object")
    .map((message) => {
      const item = message as Partial<ChatMessage>;
      return {
        role: item.role === "assistant" ? "assistant" : "user",
        content: typeof item.content === "string" ? item.content : "",
        sources: Array.isArray(item.sources) ? item.sources : undefined,
        citations: Array.isArray(item.citations) ? item.citations : undefined,
        routing: item.routing,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : "",
      };
    });
}
