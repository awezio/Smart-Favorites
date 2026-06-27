import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient, getAuthUser } from "@/lib/auth/get-user";
import { agentChat } from "@/lib/agent/harness";
import { maybeGenerateSessionTitleOnServer } from "@/lib/chat/title-generator";
import { ragChat, ragChatStream, createRagChatSseStream } from "@/lib/rag/rag-engine";
import { isSupportedProvider } from "@/lib/ai/provider-config";
import { supportsProviderStreaming } from "@/lib/ai/chat-stream-shared";
import type { ChatMessage } from "@/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      query,
      sessionId,
      chatHistory = [],
      provider,
      model,
      knowledgeMode,
      mode,
      stream,
      locale,
    } = body;

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
    const useAgentMode = mode === "agent";

    const supabase = await createAuthenticatedSupabaseClient(user);

    const wantsStream = stream === true;
    const streamProvider =
      providerOverride && supportsProviderStreaming(providerOverride)
        ? providerOverride
        : undefined;
    const shouldStream = wantsStream && Boolean(streamProvider) && !useAgentMode;

    if (shouldStream && streamProvider) {
      const generator = ragChatStream(
        query,
        chatHistory,
        12,
        userId,
        providerOverride,
        modelOverride,
        supabase,
        knowledgeModeOverride
      );

      return new Response(createRagChatSseStream(generator), {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const result = useAgentMode
      ? await agentChat(
          query,
          chatHistory,
          12,
          userId,
          providerOverride,
          modelOverride,
          supabase,
          knowledgeModeOverride
        )
      : await ragChat(
          query,
          chatHistory,
          12,
          userId,
          providerOverride,
          modelOverride,
          supabase,
          knowledgeModeOverride
        );

    let generatedTitle: string | undefined;
    let titleStatus: string | undefined;
    let titleSource: string | undefined;

    if (typeof sessionId === "string" && sessionId.trim()) {
      const historyMessages = Array.isArray(chatHistory)
        ? (chatHistory as ChatMessage[]).map((message) => ({
            role: message.role,
            content: message.content,
          }))
        : [];
      const exchangeMessages = [
        ...historyMessages,
        { role: "user" as const, content: query },
        { role: "assistant" as const, content: result.answer || "" },
      ];

      try {
        const titleResult = await maybeGenerateSessionTitleOnServer(
          userId,
          sessionId.trim(),
          exchangeMessages,
          locale === "en" ? "en" : "zh"
        );
        if (titleResult) {
          generatedTitle = titleResult.title;
          titleStatus = titleResult.source === "ai" ? "ready" : "failed";
          titleSource = titleResult.source;
        }
      } catch (titleError) {
        console.error("Server-side session title generation failed:", titleError);
      }
    }

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      citations: result.citations,
      routing: result.routing,
      error: result.error,
      sessionId,
      generatedTitle,
      titleStatus,
      titleSource,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
