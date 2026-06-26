import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient, getAuthUser } from "@/lib/auth/get-user";
import {
  fallbackSessionTitle,
  generateSessionTitle,
} from "@/lib/chat/title-generator";
import { normalizeSessionMessages } from "@/lib/chat/normalize-session-messages";
import { isPlaceholderSessionTitle } from "@/lib/chat/session-title-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const locale = body.locale === "en" ? "en" : "zh";

    const supabase = await createAuthenticatedSupabaseClient(user);
    const { data: session, error: fetchError } = await supabase
      .from("chat_sessions")
      .select("id, title, title_status, messages, metadata")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = normalizeSessionMessages(body.messages ?? session.messages);
    if (messages.length < 2) {
      return NextResponse.json({ error: "At least one exchange is required" }, { status: 400 });
    }

    if (
      session.title_status === "ready" &&
      !isPlaceholderSessionTitle(session.title) &&
      !body.force
    ) {
      return NextResponse.json({
        title: session.title,
        title_status: session.title_status,
        skipped: true,
      });
    }

    await supabase
      .from("chat_sessions")
      .update({ title_status: "generating" })
      .eq("id", id)
      .eq("user_id", userId);

    let title = "";
    try {
      title = await generateSessionTitle(userId, messages, locale);
    } catch {
      title = fallbackSessionTitle(messages, locale);
    }

    const existingMetadata =
      session.metadata && typeof session.metadata === "object" && !Array.isArray(session.metadata)
        ? (session.metadata as Record<string, unknown>)
        : {};

    const { data: updated, error: updateError } = await supabase
      .from("chat_sessions")
      .update({
        title,
        title_status: "ready",
        title_generated_at: new Date().toISOString(),
        metadata: {
          ...existingMetadata,
          title_source: "ai",
        },
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, title, title_status, title_generated_at")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      title: updated?.title || title,
      title_status: updated?.title_status || "ready",
      title_generated_at: updated?.title_generated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
