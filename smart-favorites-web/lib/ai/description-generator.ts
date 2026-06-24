import "server-only";

import { callProviderChat, getEnvProviderKey, isSupportedProvider } from "@/lib/ai/provider-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/server/secrets";

export type GeneratedDescription = {
  description_zh: string;
  description_en: string;
  description_metadata: {
    reachable: boolean;
    fetched_url: string;
    host: string | null;
    page_title?: string;
    page_description?: string;
    content_chars?: number;
    generated_at: string;
    provider?: string;
    model?: string;
    fallback?: boolean;
    error?: string;
  };
};

type PageContext = {
  reachable: boolean;
  url: string;
  host: string | null;
  title?: string;
  description?: string;
  text?: string;
  error?: string;
};

type AiSelection = {
  provider: string;
  model?: string;
  apiKey: string;
};

const BOOKMARK_PROMPT_INSTRUCTION =
  "请访问这个网站并浏览，总结这个网站是什么、具体用途和受众人群。";

export async function generateBookmarkDescription(
  url: string,
  title?: string,
  options: { userId?: string } = {}
): Promise<GeneratedDescription> {
  const page = await fetchPageContext(url);
  const safeTitle = title?.trim() || page.title || page.host || "Untitled bookmark";

  return generateWithAiOrFallback({
    userId: options.userId,
    prompt: `${BOOKMARK_PROMPT_INSTRUCTION}\n\n${buildBookmarkPrompt({ title: safeTitle, url, page })}`,
    fallback: buildFallbackDescription({
      title: safeTitle,
      url,
      page,
      kind: "bookmark",
    }),
    page,
  });
}

export async function generateStarDescription(
  item: {
    owner?: string;
    repo?: string;
    url?: string;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
  },
  options: { userId?: string } = {}
): Promise<GeneratedDescription> {
  const title = `${item.owner || "unknown"}/${item.repo || "repository"}`;
  const page = await fetchPageContext(item.url || `https://github.com/${title}`);

  return generateWithAiOrFallback({
    userId: options.userId,
    prompt: buildStarPrompt({ title, item, page }),
    fallback: buildFallbackDescription({
      title,
      url: item.url || page.url,
      page,
      kind: "GitHub star",
      existingDescription: item.description,
      language: item.language,
    }),
    page,
  });
}

async function generateWithAiOrFallback({
  userId,
  prompt,
  fallback,
  page,
}: {
  userId?: string;
  prompt: string;
  fallback: GeneratedDescription;
  page: PageContext;
}) {
  try {
    if (!userId) throw new Error("Missing user id for AI provider resolution.");
    const selection = await resolveUserAiSelection(userId);
    if (!selection.apiKey) throw new Error(`No API key configured for ${selection.provider}.`);
    const response = await callProviderChat({
      provider: selection.provider,
      apiKey: selection.apiKey,
      model: selection.model,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You write detailed bilingual knowledge-base descriptions. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const parsed = parseDescriptionJson(response.content);
    return {
      description_zh: parsed.description_zh,
      description_en: parsed.description_en,
      description_metadata: {
        ...baseMetadata(page),
        provider: selection.provider,
        model: response.model || selection.model,
      },
    };
  } catch (error: any) {
    return {
      ...fallback,
      description_metadata: {
        ...fallback.description_metadata,
        fallback: true,
        error: error.message || "AI generation failed",
      },
    };
  }
}

async function resolveUserAiSelection(userId: string): Promise<AiSelection> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("default_llm_provider, default_llm_model, api_keys")
    .eq("user_id", userId)
    .maybeSingle();

  const savedProvider = data?.default_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "deepseek";
  const provider = isSupportedProvider(savedProvider) ? savedProvider : "deepseek";
  const saved = data?.api_keys?.[provider];
  const apiKey = saved ? decryptSecret(saved) : getEnvProviderKey(provider);

  return {
    provider,
    model: typeof data?.default_llm_model === "string" ? data.default_llm_model : undefined,
    apiKey,
  };
}

async function fetchPageContext(url: string): Promise<PageContext> {
  const normalized = normalizePublicHttpUrl(url);
  if (!normalized.ok) {
    return {
      reachable: false,
      url,
      host: null,
      error: normalized.error,
    };
  }

  try {
    const response = await fetch(normalized.url, {
      headers: {
        accept: "text/html, text/plain;q=0.9, */*;q=0.5",
        "user-agent": "Smart-Favorites/1.0 (+https://smart-favorites.vercel.app)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    const contentType = response.headers.get("content-type") || "";
    const text = contentType.includes("text") || contentType.includes("html")
      ? await response.text()
      : "";
    const html = text.slice(0, 120000);
    const extracted = extractPageText(html);

    return {
      reachable: response.ok,
      url: response.url || normalized.url,
      host: new URL(normalized.url).hostname,
      title: extracted.title,
      description: extracted.description,
      text: extracted.text.slice(0, 9000),
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      reachable: false,
      url: normalized.url,
      host: new URL(normalized.url).hostname,
      error: error.name === "TimeoutError" ? "Fetch timeout" : error.message,
    };
  }
}

function normalizePublicHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false as const, error: "Only http and https URLs can be fetched." };
    }
    if (isBlockedHost(parsed.hostname)) {
      return { ok: false as const, error: "Local or private network URLs are not fetched." };
    }
    return { ok: true as const, url: parsed.toString() };
  } catch {
    return { ok: false as const, error: "Invalid URL." };
  }
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function extractPageText(html: string) {
  const title = decodeHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decodeHtml(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      matchFirst(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  );
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  return { title, description, text };
}

function matchFirst(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim() || "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function buildBookmarkPrompt({
  title,
  url,
  page,
}: {
  title: string;
  url: string;
  page: PageContext;
}) {
  return `请利用网页可达性和抓取到的内容，为这个书签生成详细的双语知识库描述。

必须覆盖：用途、内容、服务人群。网页可达时要基于网页内容总结；网页不可达时说明只能基于标题、URL 和已有元数据推断。

Return JSON only:
{
  "description_zh": "中文。尽可能详细，覆盖用途、内容、服务人群。",
  "description_en": "English. Detailed summary covering purpose, content, and target audience."
}

Bookmark:
Title: ${title}
URL: ${url}
Reachable: ${page.reachable}
Fetch error: ${page.error || ""}
Page title: ${page.title || ""}
Meta description: ${page.description || ""}
Extracted content:
${page.text || ""}`;
}

function buildStarPrompt({
  title,
  item,
  page,
}: {
  title: string;
  item: any;
  page: PageContext;
}) {
  return `请为这个 GitHub Star 生成详细的双语知识库描述，便于和书签、文档通过 OKF 知识库互相关联。

必须覆盖：用途、内容、服务人群。可结合仓库名称、语言、stars/forks、已有描述和可抓取网页内容。

Return JSON only:
{
  "description_zh": "中文。尽可能详细，覆盖用途、内容、服务人群。",
  "description_en": "English. Detailed summary covering purpose, content, and target audience."
}

Repository: ${title}
URL: ${item.url || page.url}
Language: ${item.language || ""}
Stars: ${item.stars ?? ""}
Forks: ${item.forks ?? ""}
Existing description: ${item.description || ""}
Reachable: ${page.reachable}
Extracted content:
${page.text || ""}`;
}

function parseDescriptionJson(content: string) {
  const jsonText =
    content.match(/```json\s*([\s\S]*?)```/i)?.[1] ||
    content.match(/\{[\s\S]*\}/)?.[0] ||
    "{}";
  const parsed = JSON.parse(jsonText);
  const description_zh = String(parsed.description_zh || parsed.zh || "").trim();
  const description_en = String(parsed.description_en || parsed.en || "").trim();
  if (!description_zh || !description_en) {
    throw new Error("Model response did not include both description_zh and description_en.");
  }
  return { description_zh, description_en };
}

function buildFallbackDescription({
  title,
  url,
  page,
  kind,
  existingDescription,
  language,
}: {
  title: string;
  url: string;
  page: PageContext;
  kind: string;
  existingDescription?: string;
  language?: string;
}): GeneratedDescription {
  const host = page.host ? ` (${page.host})` : "";
  const source = page.reachable
    ? page.description || page.text?.slice(0, 240) || existingDescription || title
    : existingDescription || page.error || "The page could not be reached.";
  const languageHint = language ? `，主要技术/语言为 ${language}` : "";

  return {
    description_zh: `${title}${host} 是一个 ${kind}。当前摘要基于${page.reachable ? "可访问网页内容" : "标题、URL 和已有元数据"}生成${languageHint}。用途、内容和服务人群需要在配置 AI 模型后进一步细化。参考信息：${source}`,
    description_en: `${title}${host} is a ${kind}. This summary is based on ${page.reachable ? "reachable webpage content" : "the title, URL, and existing metadata"}. Its purpose, content, and target audience should be refined further once an AI model is configured. Reference: ${source}`,
    description_metadata: {
      ...baseMetadata(page),
      fallback: true,
    },
  };
}

function baseMetadata(page: PageContext) {
  return {
    reachable: page.reachable,
    fetched_url: page.url,
    host: page.host,
    page_title: page.title,
    page_description: page.description,
    content_chars: page.text?.length || 0,
    generated_at: new Date().toISOString(),
  };
}
