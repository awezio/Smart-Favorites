import { NextRequest, NextResponse } from "next/server";
import { ragChat } from "@/lib/rag/rag-engine";
import { getAuthUser } from "@/lib/auth/get-user";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupportedProvider } from "@/lib/ai/provider-config";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, sessionId, chatHistory = [], provider, model, knowledgeMode } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const providerOverride =
      typeof provider === "string" && isSupportedProvider(provider) ? provider : undefined;
    const modelOverride =
      typeof model === "string" && model.trim() ? model.trim() : undefined;
    const knowledgeModeOverride =
      knowledgeMode === "always" || knowledgeMode === "never" ? knowledgeMode : "auto";

    const supabase = await createServerSupabaseClient();
    const result = await ragChat(
      query,
      chatHistory,
      5,
      userId,
      providerOverride,
      modelOverride,
      supabase,
      knowledgeModeOverride
    );

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      routing: result.routing,
      error: result.error,
      sessionId,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
