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
import { isPlaceholderSessionTitle } from "@/lib/chat/session-title-utils";
import type { ChatMessage } from "@/types";

export { isPlaceholderSessionTitle } from "@/lib/chat/session-title-utils";

export function fallbackSessionTitle(
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): string {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.content?.trim() || "";
  if (!text) {
    return locale === "zh" ? "新会话" : "New session";
  }
  const cleaned = text.replace(/\n+/g, " ").trim();
  const max = locale === "zh" ? 24 : 48;
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`;
}

export async function generateSessionTitle(
  userId: string,
  messages: Pick<ChatMessage, "role" | "content">[],
  locale: "zh" | "en" = "zh"
): Promise<string> {
  const relevant = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, 4);

  if (relevant.length === 0) {
    return fallbackSessionTitle(messages, locale);
  }

  const { provider, model, enabled } = await getTitleModelSelection(userId);
  if (!enabled) {
    return fallbackSessionTitle(messages, locale);
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
      return title;
    }
  } catch (error) {
    if (error instanceof ProviderApiError) {
      // Fall through to heuristic title.
    }
  }

  return fallbackSessionTitle(messages, locale);
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
