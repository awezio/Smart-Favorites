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
import { decryptSecret } from "@/lib/server/secrets";
import type { SearchResult, LLMMessage } from "@/types";

type RagResponse = {
  answer: string;
  sources: SearchResult[];
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
  const route = classifyChatRoute(query, knowledgeMode);
  let sources: SearchResult[] = [];
  if (route.useKnowledge) {
    sources = await searchAll(query, topK, 0.3, userId, client);
  }
  const fallback = buildFallbackAnswer(query, sources, chatHistory);
  const savedDefaults = await getDefaultAiSelection(userId);
  const selectedProvider = provider && isSupportedProvider(provider) ? provider : savedDefaults.provider;
  const selectedModel = model || (!provider ? savedDefaults.model : undefined);

  try {
    const apiKey = await resolveProviderKey(userId, selectedProvider);
    const prompt = route.useKnowledge ? buildRagPrompt(query, sources) : query;
    const response = await callProviderChat({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: route.useKnowledge
            ? "You are Smart Favorites, a concise personal knowledge assistant. Answer from the provided bookmarks, GitHub stars, and documents. If evidence is thin, say so."
            : "You are Smart Favorites, a concise assistant. For ordinary direct chat, answer naturally without claiming that you searched the user's knowledge base.",
        },
        ...chatHistory.slice(-8),
        { role: "user", content: prompt },
      ],
    });

    await logAiCall({
      userId,
      provider: selectedProvider,
      model: response.model,
      status: "success",
      usage: response.usage,
    });

    const answer = response.content?.trim() || fallback;
    return { answer, sources, routing: route };
  } catch (error: any) {
    const providerError = classifyProviderError(error);
    await logAiCall({
      userId,
      provider: selectedProvider,
      model: selectedModel || "",
      status: "error",
      error: providerError.logMessage,
    });

    return {
      answer: providerError.userMessage || fallback,
      sources,
      routing: route,
      error: {
        type: providerError.type,
        message: providerError.userMessage,
      },
    };
  }

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
    return decryptSecret(saved);
  }

  return getEnvProviderKey(provider);
}

function buildRagPrompt(query: string, sources: SearchResult[]) {
  const evidence = sources.slice(0, 12).map((source, index) => {
    if (source.type === "bookmark" && source.bookmark) {
      const structuredDetails = structuredDescriptionToRagText(
        source.bookmark.description_metadata?.structured_description
      );
      return `${index + 1}. [bookmark] ${source.bookmark.title}\nURL: ${source.bookmark.url}\nFolder: ${source.bookmark.folder_path || ""}\nDescription: ${source.bookmark.description_zh || source.bookmark.description || source.bookmark.description_en || ""}${structuredDetails ? `\nDescription details:\n${structuredDetails}` : ""}`;
    }

    if (source.type === "star" && source.star) {
      const structuredDetails = structuredDescriptionToRagText(
        source.star.description_metadata?.structured_description
      );
      return `${index + 1}. [github_star] ${source.star.owner}/${source.star.repo}\nURL: ${source.star.url}\nLanguage: ${source.star.language || ""}\nDescription: ${source.star.description_zh || source.star.description || source.star.description_en || ""}${structuredDetails ? `\nDescription details:\n${structuredDetails}` : ""}`;
    }

    if (source.type === "document" && source.document) {
      const location = [
        source.document.file_name ? `File: ${source.document.file_name}` : "",
        source.document.page_number ? `Page: ${source.document.page_number}` : "",
        source.document.section_title ? `Section: ${source.document.section_title}` : "",
      ].filter(Boolean);

      return `${index + 1}. [document] ${source.document.title}\n${location.join("\n")}\nContent: ${source.document.content}`;
    }

    return `${index + 1}. ${source.id}`;
  });

  return `Question: ${query}\n\nPersonal knowledge evidence:\n${evidence.join("\n\n") || "No matching evidence."}\n\nAnswer in the user's language. If the user asks to find, search, or list saved resources, enumerate the most relevant evidence with concrete item names and URLs. Do not say no matching items were found when evidence is present; instead explain any uncertainty briefly.`;
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

function classifyProviderError(error: unknown): {
  type: "rate_limited" | "provider_error";
  userMessage: string;
  logMessage: string;
} {
  const status = error instanceof ProviderApiError ? error.status : undefined;
  const body = error instanceof ProviderApiError ? error.body : "";
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = `${message} ${body}`;
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

  return {
    type: "provider_error",
    userMessage: "当前模型调用失败。请稍后重试，或切换到另一个已配置模型。",
    logMessage: diagnostic.slice(0, 500),
  };
}
