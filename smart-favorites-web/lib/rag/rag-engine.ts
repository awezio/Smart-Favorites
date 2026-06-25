import { searchAll, type SupabaseQueryClient } from "@/lib/rag/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { structuredDescriptionToRagText } from "@/lib/ai/description-generator";
import {
  ProviderApiError,
  callProviderChat,
  getEnvProviderKey,
  isSupportedProvider,
} from "@/lib/ai/provider-config";
import { classifyChatRoute, type ChatKnowledgeMode, type ChatRoutingMetadata } from "@/lib/chat/routing";
import {
  RAG_DIRECT_CHAT_SYSTEM_PROMPT,
  RAG_KNOWLEDGE_SYSTEM_PROMPT,
  buildRagAnswerInstructions,
} from "@/lib/prompts/chat-rag";
import { parseCitationsFromAnswer } from "@/lib/rag/citations";
import { decryptSecret } from "@/lib/server/secrets";
import {
  type ChatStreamEvent,
} from "@/lib/ai/chat-stream-shared";
import {
  formatSseEvent,
  streamProviderChat,
} from "@/lib/ai/provider-stream";
import type { SearchResult, LLMMessage } from "@/types";

export type { ChatStreamEvent };

type RagResponse = {
  answer: string;
  sources: SearchResult[];
  citations?: ReturnType<typeof parseCitationsFromAnswer>;
  routing: ChatRoutingMetadata;
  error?: {
    type: "rate_limited" | "provider_error";
    message: string;
  };
};

export async function ragChat(
  query: string,
  chatHistory: LLMMessage[] = [],
  topK: number,
  userId: string,
  provider?: string,
  model?: string,
  client?: SupabaseQueryClient,
  knowledgeMode: ChatKnowledgeMode = "auto"
): Promise<RagResponse> {
  const context = await buildRagChatContext(
    query,
    chatHistory,
    topK,
    userId,
    provider,
    model,
    client,
    knowledgeMode
  );

  try {
    const response = await callProviderChat({
      provider: context.selectedProvider,
      apiKey: context.apiKey,
      model: context.selectedModel,
      maxTokens: context.route.useKnowledge ? 2000 : 800,
      timeoutMs: context.route.useKnowledge ? 300_000 : 45_000,
      messages: context.messages,
    });

    await logAiCall({
      userId,
      provider: context.selectedProvider,
      model: response.model,
      status: "success",
      usage: response.usage,
    });

    const answer = response.content?.trim() || context.fallback;
    const citations =
      context.route.useKnowledge && context.sources.length > 0
        ? parseCitationsFromAnswer(answer, context.sources.slice(0, 12))
        : undefined;
    return { answer, sources: context.sources, citations, routing: context.route };
  } catch (error: any) {
    const providerError = classifyProviderError(error);
    await logAiCall({
      userId,
      provider: context.selectedProvider,
      model: context.selectedModel || "",
      status: "error",
      error: providerError.logMessage,
    });

    return {
      answer: buildProviderFailureAnswer(providerError, context.fallback, context.sources),
      sources: context.sources,
      routing: context.route,
      error: {
        type: providerError.type,
        message: providerError.userMessage,
      },
    };
  }
}

export async function* ragChatStream(
  query: string,
  chatHistory: LLMMessage[] = [],
  topK: number,
  userId: string,
  provider?: string,
  model?: string,
  client?: SupabaseQueryClient,
  knowledgeMode: ChatKnowledgeMode = "auto"
): AsyncGenerator<ChatStreamEvent> {
  const context = await buildRagChatContext(
    query,
    chatHistory,
    topK,
    userId,
    provider,
    model,
    client,
    knowledgeMode
  );

  yield { type: "routing", routing: context.route };
  yield { type: "sources", sources: context.sources };

  let answer = "";

  try {
    for await (const event of streamProviderChat({
      provider: context.selectedProvider,
      apiKey: context.apiKey,
      model: context.selectedModel,
      maxTokens: context.route.useKnowledge ? 2000 : 800,
      timeoutMs: context.route.useKnowledge ? 300_000 : 45_000,
      messages: context.messages,
    })) {
      if (event.type === "delta") {
        answer += event.content;
        yield event;
      } else if (event.type === "error") {
        yield event;
        return;
      } else if (event.type === "done") {
        const finalAnswer = answer.trim() || context.fallback;
        const citations =
          context.route.useKnowledge && context.sources.length > 0
            ? parseCitationsFromAnswer(finalAnswer, context.sources.slice(0, 12))
            : undefined;

        await logAiCall({
          userId,
          provider: context.selectedProvider,
          model: event.model,
          status: "success",
        });

        yield { type: "done", model: event.model, citations };
      }
    }
  } catch (error: any) {
    const providerError = classifyProviderError(error);
    await logAiCall({
      userId,
      provider: context.selectedProvider,
      model: context.selectedModel || "",
      status: "error",
      error: providerError.logMessage,
    });
    yield {
      type: "error",
      message: buildProviderFailureAnswer(providerError, context.fallback, context.sources),
    };
  }
}

export function createRagChatSseStream(
  generator: AsyncGenerator<ChatStreamEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          controller.enqueue(encoder.encode(formatSseEvent(event)));
        }
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(
            formatSseEvent({
              type: "error",
              message: error?.message || "Stream failed",
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

async function buildRagChatContext(
  query: string,
  chatHistory: LLMMessage[],
  topK: number,
  userId: string,
  provider?: string,
  model?: string,
  client?: SupabaseQueryClient,
  knowledgeMode: ChatKnowledgeMode = "auto"
) {
  const route = classifyChatRoute(query, knowledgeMode);
  let sources: SearchResult[] = [];
  if (route.useKnowledge) {
    sources = await searchAll(query, topK, 0.3, userId, client);
  }
  const fallback = buildFallbackAnswer(query, sources, chatHistory);
  const savedDefaults = await getDefaultAiSelection(userId);
  const selectedProvider = provider && isSupportedProvider(provider) ? provider : savedDefaults.provider;
  const selectedModel = model || (!provider ? savedDefaults.model : undefined);
  const apiKey = await resolveProviderKey(userId, selectedProvider);
  const prompt = route.useKnowledge ? buildRagPrompt(query, sources) : query;

  return {
    route,
    sources,
    fallback,
    selectedProvider,
    selectedModel,
    apiKey,
    messages: [
      {
        role: "system" as const,
        content: route.useKnowledge
          ? RAG_KNOWLEDGE_SYSTEM_PROMPT
          : RAG_DIRECT_CHAT_SYSTEM_PROMPT,
      },
      ...chatHistory.slice(-8),
      { role: "user" as const, content: prompt },
    ],
  };
}

async function getDefaultAiSelection(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("default_llm_provider, default_llm_model")
    .eq("user_id", userId)
    .maybeSingle();

  const provider = data?.default_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "deepseek";
  return {
    provider: isSupportedProvider(provider) ? provider : "deepseek",
    model: typeof data?.default_llm_model === "string" ? data.default_llm_model : undefined,
  };
}

async function resolveProviderKey(userId: string, provider: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("api_keys")
    .eq("user_id", userId)
    .maybeSingle();

  const saved = data?.api_keys?.[provider];
  if (saved) {
    try {
      const decrypted = decryptSecret(saved);
      if (decrypted) {
        return decrypted;
      }
    } catch {
      // Stored key may be unreadable after encryption secret rotation; fall back to env.
    }
  }

  return getEnvProviderKey(provider);
}

const RAG_DESCRIPTION_MAX_CHARS = 320;
const RAG_DOCUMENT_MAX_CHARS = 480;
const RAG_STRUCTURED_MAX_CHARS = 420;

function truncateRagText(value: string | null | undefined, maxChars: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

function buildRagPrompt(query: string, sources: SearchResult[]) {
  const evidence = sources.slice(0, 12).map((source, index) => {
    if (source.type === "bookmark" && source.bookmark) {
      const structuredDetails = truncateRagText(
        structuredDescriptionToRagText(
          source.bookmark.description_metadata?.structured_description
        ),
        RAG_STRUCTURED_MAX_CHARS
      );
      return `${index + 1}. [bookmark] ${source.bookmark.title}\nURL: ${source.bookmark.url}\nFolder: ${source.bookmark.folder_path || ""}\nDescription: ${truncateRagText(source.bookmark.description_zh || source.bookmark.description || source.bookmark.description_en || "", RAG_DESCRIPTION_MAX_CHARS)}${structuredDetails ? `\nDescription details:\n${structuredDetails}` : ""}`;
    }

    if (source.type === "star" && source.star) {
      const structuredDetails = truncateRagText(
        structuredDescriptionToRagText(
          source.star.description_metadata?.structured_description
        ),
        RAG_STRUCTURED_MAX_CHARS
      );
      return `${index + 1}. [github_star] ${source.star.owner}/${source.star.repo}\nURL: ${source.star.url}\nLanguage: ${source.star.language || ""}\nDescription: ${truncateRagText(source.star.description_zh || source.star.description || source.star.description_en || "", RAG_DESCRIPTION_MAX_CHARS)}${structuredDetails ? `\nDescription details:\n${structuredDetails}` : ""}`;
    }

    if (source.type === "document" && source.document) {
      const location = [
        source.document.file_name ? `File: ${source.document.file_name}` : "",
        source.document.page_number ? `Page: ${source.document.page_number}` : "",
        source.document.section_title ? `Section: ${source.document.section_title}` : "",
      ].filter(Boolean);

      return `${index + 1}. [document] ${source.document.title}\n${location.join("\n")}\nContent: ${truncateRagText(source.document.content, RAG_DOCUMENT_MAX_CHARS)}`;
    }

    return `${index + 1}. ${source.id}`;
  });

  const hasEvidence = evidence.length > 0;
  const evidenceBlock = hasEvidence
    ? evidence.join("\n\n")
    : "No matching evidence.";

  return `Question: ${query}\n\nPersonal knowledge evidence (sources [1]–[${evidence.length || 0}]):\n${evidenceBlock}\n\n${buildRagAnswerInstructions(hasEvidence)}`;
}

async function logAiCall({
  userId,
  provider,
  model,
  status,
  usage,
  error,
}: {
  userId: string;
  provider: string;
  model: string;
  status: "success" | "error";
  usage?: any;
  error?: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("ai_call_logs").insert({
      user_id: userId,
      provider,
      model,
      status,
      prompt_tokens: usage?.prompt_tokens || usage?.input_tokens || 0,
      completion_tokens: usage?.completion_tokens || usage?.output_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
      error_message: error ? String(error).slice(0, 500) : null,
    });
  } catch {
    // Metrics should never break chat.
  }
}

function buildFallbackAnswer(
  query: string,
  sources: SearchResult[],
  chatHistory: LLMMessage[]
): string {
  const historyHint = chatHistory.length > 0 ? "Based on your recent context, " : "";

  if (sources.length === 0) {
    return `${historyHint}我现在无法连接所选模型。你可以稍后重试，或切换到另一个已配置模型。`;
  }

  const topLines = sources.slice(0, 8).map((source, index) => {
    if (source.type === "bookmark" && source.bookmark) {
      return `${index + 1}. ${source.bookmark.title} (${source.bookmark.url})`;
    }

    if (source.type === "star" && source.star) {
      return `${index + 1}. ${source.star.owner}/${source.star.repo} (${source.star.url})`;
    }

    if (source.type === "document" && source.document) {
      return `${index + 1}. ${source.document.title}: ${source.document.content.slice(0, 120)}`;
    }

    return `${index + 1}. Result ${source.id}`;
  });

  return `${historyHint}Here are the closest matches for "${query}":\n${topLines.join("\n")}`;
}

function buildProviderFailureAnswer(
  providerError: {
    type: "rate_limited" | "provider_error";
    userMessage: string;
  },
  fallback: string,
  sources: SearchResult[]
): string {
  if (sources.length === 0) {
    return providerError.userMessage;
  }

  if (providerError.type === "rate_limited") {
    return providerError.userMessage;
  }

  return `${providerError.userMessage}\n\n${fallback}`;
}

function classifyProviderError(error: unknown): {
  type: "rate_limited" | "provider_error";
  userMessage: string;
  logMessage: string;
} {
  const status = error instanceof ProviderApiError ? error.status : undefined;
  const body = error instanceof ProviderApiError ? error.body : "";
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = `${message} ${body}`;
  const isTimeout =
    /timeout|timed out|aborted due to timeout|ETIMEDOUT|AbortError/i.test(diagnostic);
  const isRateLimited =
    status === 429 ||
    /"code"\s*:\s*"?(1302|rate[_-]?limit)/i.test(diagnostic) ||
    /rate limit|too many requests|速率限制|请求频率|限流/i.test(diagnostic);

  if (isRateLimited) {
    return {
      type: "rate_limited",
      userMessage:
        "当前模型达到请求速率限制。请稍后再试，或切换到另一个已配置模型；我不会把原始 API 错误当作回答展示。",
      logMessage: diagnostic.slice(0, 500),
    };
  }

  if (isTimeout) {
    return {
      type: "provider_error",
      userMessage:
        "当前模型在生成回答时超时。我已保留检索到的来源，你也可以稍后重试或切换到响应更快的模型。",
      logMessage: diagnostic.slice(0, 500),
    };
  }

  return {
    type: "provider_error",
    userMessage: "当前模型调用失败。请稍后重试，或切换到另一个已配置模型。",
    logMessage: diagnostic.slice(0, 500),
  };
}
