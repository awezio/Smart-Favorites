import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import {
  aggregateSessionSources,
  exportSourcesAsJson,
  exportSourcesAsMarkdown,
} from "@/lib/chat/session-sources";
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
    const format = request.nextUrl.searchParams.get("format") || "json";
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
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
    const sources = aggregateSessionSources(messages);

    if (format === "md" || format === "markdown") {
      const markdown = exportSourcesAsMarkdown(session.title, sources, locale);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="session-sources-${id}.md"`,
        },
      });
    }

    const payload = exportSourcesAsJson(session.id, session.title, sources);
    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="session-sources-${id}.json"`,
      },
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
