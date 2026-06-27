import "server-only";

import {
  ProviderApiError,
  callProviderChat,
  getEnvProviderKey,
  isSupportedProvider,
} from "@/lib/ai/provider-config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_TITLE_SYSTEM_PROMPT,
  buildSessionTitleUserPrompt,
} from "@/lib/prompts/session-title";
import { decryptSecret } from "@/lib/server/secrets";
import { isPlaceholderSessionTitle, shouldRegenerateSessionTitle } from "@/lib/chat/session-title-utils";
import type { ChatMessage } from "@/types";

export { isPlaceholderSessionTitle } from "@/lib/chat/session-title-utils";
export type SessionTitleSource = "ai" | "fallback";

export type SessionTitleResult = {
  title: string;
  source: SessionTitleSource;
};

const ZH_STOP_WORDS = new Set([
  "的",
  "了",
  "在",
  "是",
  "我",
  "有",
  "和",
  "就",
  "不",
  "人",
  "都",
  "一",
  "一个",
  "上",
  "也",
  "很",
  "到",
  "说",
  "要",
  "去",
  "你",
  "会",
  "着",
  "没有",
  "看",
  "好",
  "自己",
  "这",
  "那",
  "吗",
  "呢",
  "吧",
  "啊",
  "请",
  "帮",
  "帮我",
  "一下",
  "能否",
  "可以",
  "怎么",
  "什么",
  "哪些",
  "如何",
]);

const EN_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "my",
  "me",
  "i",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "this",
  "that",
  "these",
  "those",
  "please",
  "help",
  "find",
  "show",
  "get",
]);

export function fallbackSessionTitle(
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): string {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.content?.trim() || "";
  if (!text) {
    return locale === "zh" ? "新会话" : "New session";
  }

  const firstSentence = text.split(/[。！？.!?\n]/)[0]?.replace(/\s+/g, " ").trim() || text;
  const maxLen = locale === "zh" ? 12 : 40;

  if (locale === "zh") {
    const chars = [...firstSentence].filter((char) => !ZH_STOP_WORDS.has(char));
    const condensed = chars.join("").slice(0, maxLen);
    if (condensed.length >= 4) {
      return condensed;
    }
  } else {
    const words = firstSentence
      .split(/\s+/)
      .map((word) => word.replace(/^[^\w]+|[^\w]+$/g, ""))
      .filter((word) => word.length > 1 && !EN_STOP_WORDS.has(word.toLowerCase()));
    const condensed = words.slice(0, 6).join(" ");
    if (condensed.length >= 4) {
      return condensed.length <= maxLen ? condensed : `${condensed.slice(0, maxLen)}…`;
    }
  }

  const cleaned = firstSentence.trim();
  return cleaned.length <= maxLen ? cleaned : `${cleaned.slice(0, maxLen)}…`;
}

export async function generateSessionTitle(
  userId: string,
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): Promise<string> {
  const result = await generateSessionTitleWithSource(userId, messages, locale);
  return result.title;
}

export async function generateSessionTitleWithSource(
  userId: string,
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): Promise<SessionTitleResult> {
  const relevant = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, 4);

  if (relevant.length === 0) {
    return { title: fallbackSessionTitle(messages, locale), source: "fallback" };
  }

  const { provider, model, enabled } = await getTitleModelSelection(userId);
  if (!enabled) {
    return { title: fallbackSessionTitle(messages, locale), source: "fallback" };
  }

  try {
    const apiKey = await resolveProviderKey(userId, provider);
    const response = await callProviderChat({
      provider,
      apiKey,
      model,
      maxTokens: 32,
      timeoutMs: 20_000,
      messages: [
        { role: "system", content: SESSION_TITLE_SYSTEM_PROMPT },
        { role: "user", content: buildSessionTitleUserPrompt(relevant) },
      ],
    });

    const title = sanitizeTitle(response.content || "");
    if (title) {
      return { title, source: "ai" };
    }
  } catch (error) {
    if (error instanceof ProviderApiError) {
      console.error("Session title provider error:", error.message);
    } else {
      console.error("Session title generation error:", error);
    }
  }

  return { title: fallbackSessionTitle(messages, locale), source: "fallback" };
}

export async function maybeGenerateSessionTitleOnServer(
  userId: string,
  sessionId: string,
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): Promise<SessionTitleResult | null> {
  const userCount = messages.filter((message) => message.role === "user").length;
  const assistantCount = messages.filter((message) => message.role === "assistant").length;
  if (userCount < 1 || assistantCount < 1) {
    return null;
  }

  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, title, title_status, metadata")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session) {
    return null;
  }

  const firstUserContent = messages.find((message) => message.role === "user")?.content;

  if (
    !shouldRegenerateSessionTitle(
      session.title || "",
      session.title_status,
      session.metadata,
      firstUserContent
    )
  ) {
    return null;
  }

  await supabase
    .from("chat_sessions")
    .update({ title_status: "generating" })
    .eq("id", sessionId)
    .eq("user_id", userId);

  const result = await generateSessionTitleWithSource(userId, messages, locale);

  const existingMetadata =
    session.metadata && typeof session.metadata === "object" && !Array.isArray(session.metadata)
      ? (session.metadata as Record<string, unknown>)
      : {};

  await supabase
    .from("chat_sessions")
    .update({
      title: result.title,
      title_status: result.source === "ai" ? "ready" : "failed",
      title_generated_at: new Date().toISOString(),
      metadata: {
        ...existingMetadata,
        title_source: result.source,
        needs_retry: result.source === "fallback",
      },
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return result;
}

function sanitizeTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^["'「『]|["'」』]$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

async function getTitleModelSelection(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select(
      "auto_title_enabled, title_llm_provider, title_llm_model, default_llm_provider, default_llm_model"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const enabled = data?.auto_title_enabled !== false;
  const providerRaw =
    data?.title_llm_provider || data?.default_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "deepseek";
  const provider = isSupportedProvider(providerRaw) ? providerRaw : "deepseek";
  const model =
    (typeof data?.title_llm_model === "string" && data.title_llm_model.trim()) ||
    (typeof data?.default_llm_model === "string" && data.default_llm_model.trim()) ||
    undefined;

  return { provider, model, enabled };
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
      // fall through
    }
  }

  return getEnvProviderKey(provider);
}
