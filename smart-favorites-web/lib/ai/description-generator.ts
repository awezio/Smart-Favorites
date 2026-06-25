import "server-only";

import { callProviderChat, getEnvProviderKey, isSupportedProvider } from "@/lib/ai/provider-config";
import {
  BOOKMARK_DESCRIPTION_PROMPT_ID,
  BOOKMARK_DESCRIPTION_SCHEMA_VERSION,
  BOOKMARK_DESCRIPTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/bookmark-description.skill";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/server/secrets";

export type StructuredWebsiteDescription = {
  purpose: {
    zh: string;
    en: string;
  };
  content: {
    zh: string[];
    en: string[];
  };
  audience: {
    zh: string[];
    en: string[];
  };
};

export type GeneratedDescription = {
  description_zh: string;
  description_en: string;
  structured_description?: StructuredWebsiteDescription;
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
    prompt_template?: string;
    schema_version?: string;
    structured_description?: StructuredWebsiteDescription;
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
  descriptionPrompt?: string;
};

export async function generateBookmarkDescription(
  url: string,
  title?: string,
  options: { userId?: string } = {}
): Promise<GeneratedDescription> {
  const page = await fetchPageContext(url);
  const safeTitle = title?.trim() || page.title || page.host || "Untitled bookmark";
  const fallback = buildFallbackDescription({
    title: safeTitle,
    url,
    page,
    kind: "bookmark",
    structured: true,
  });

  try {
    const selection = await resolveUserAiSelection(options.userId);
    const response = await callProviderChat({
      provider: selection.provider,
      apiKey: selection.apiKey,
      model: selection.model,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: selection.descriptionPrompt || BOOKMARK_DESCRIPTION_SYSTEM_PROMPT,
        },
        { role: "user", content: buildBookmarkWebsiteInfo({ title: safeTitle, url, page }) },
      ],
    });

    const structured = parseStructuredDescriptionJson(response.content);
    const generated = {
      description_zh: structuredDescriptionToDisplayText(structured, "zh"),
      description_en: structuredDescriptionToDisplayText(structured, "en"),
      structured_description: structured,
      description_metadata: {
        ...baseMetadata(page),
        provider: selection.provider,
        model: response.model || selection.model,
        prompt_template: selection.descriptionPrompt
          ? "user_settings.ai_description_prompt"
          : BOOKMARK_DESCRIPTION_PROMPT_ID,
        schema_version: BOOKMARK_DESCRIPTION_SCHEMA_VERSION,
        structured_description: structured,
      },
    };

    return generated;
  } catch (error: any) {
    return withFallbackError(fallback, error);
  }
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
  const fallback = buildFallbackDescription({
    title,
    url: item.url || page.url,
    page,
    kind: "GitHub star",
    existingDescription: item.description,
    language: item.language,
  });

  try {
    const selection = await resolveUserAiSelection(options.userId);
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
        { role: "user", content: buildStarPrompt({ title, item, page }) },
      ],
    });

    const parsed = parseFlatDescriptionJson(response.content);
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
    return withFallbackError(fallback, error);
  }
}

export function structuredDescriptionToRagText(
  structured: StructuredWebsiteDescription | null | undefined
) {
  if (!structured) return "";

  return [
    `Purpose zh: ${structured.purpose.zh}`,
    `Purpose en: ${structured.purpose.en}`,
    `Content zh: ${structured.content.zh.join(", ")}`,
    `Content en: ${structured.content.en.join(", ")}`,
    `Audience zh: ${structured.audience.zh.join(", ")}`,
    `Audience en: ${structured.audience.en.join(", ")}`,
  ]
    .filter((line) => !line.endsWith(": "))
    .join("\n");
}

async function resolveUserAiSelection(userId?: string): Promise<AiSelection> {
  if (!userId) throw new Error("Missing user id for AI provider resolution.");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_settings")
    .select("default_llm_provider, default_llm_model, api_keys, ai_description_prompt")
    .eq("user_id", userId)
    .maybeSingle();

  const savedProvider = data?.default_llm_provider || process.env.DEFAULT_LLM_PROVIDER || "deepseek";
  const provider = isSupportedProvider(savedProvider) ? savedProvider : "deepseek";
  const saved = data?.api_keys?.[provider];
  const apiKey = saved ? decryptSecret(saved) : getEnvProviderKey(provider);
  if (!apiKey) throw new Error(`No API key configured for ${provider}.`);

  return {
    provider,
    model: typeof data?.default_llm_model === "string" ? data.default_llm_model : undefined,
    apiKey,
    descriptionPrompt:
      typeof data?.ai_description_prompt === "string" && data.ai_description_prompt.trim()
        ? data.ai_description_prompt.trim()
        : undefined,
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

function buildBookmarkWebsiteInfo({
  title,
  url,
  page,
}: {
  title: string;
  url: string;
  page: PageContext;
}) {
  return `网站信息：
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
  return `Generate a detailed bilingual knowledge-base description for this GitHub Star.
Cover purpose, content, and target audience. Return JSON only:
{
  "description_zh": "中文描述",
  "description_en": "English description"
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

function parseStructuredDescriptionJson(content: string): StructuredWebsiteDescription {
  const parsed = JSON.parse(extractJsonObject(content));
  const structured = {
    purpose: {
      zh: cleanText(parsed?.purpose?.zh),
      en: cleanText(parsed?.purpose?.en),
    },
    content: {
      zh: cleanArray(parsed?.content?.zh, 5),
      en: cleanArray(parsed?.content?.en, 5),
    },
    audience: {
      zh: cleanArray(parsed?.audience?.zh, 3),
      en: cleanArray(parsed?.audience?.en, 3),
    },
  };

  if (
    !structured.purpose.zh ||
    !structured.purpose.en ||
    structured.content.zh.length === 0 ||
    structured.content.en.length === 0 ||
    structured.audience.zh.length === 0 ||
    structured.audience.en.length === 0
  ) {
    throw new Error("Model response did not include purpose, content, and audience in both languages.");
  }

  return structured;
}

function parseFlatDescriptionJson(content: string) {
  const parsed = JSON.parse(extractJsonObject(content));
  const description_zh = cleanText(parsed.description_zh || parsed.zh);
  const description_en = cleanText(parsed.description_en || parsed.en);
  if (!description_zh || !description_en) {
    throw new Error("Model response did not include both description_zh and description_en.");
  }
  return { description_zh, description_en };
}

function extractJsonObject(content: string) {
  return (
    content.match(/```json\s*([\s\S]*?)```/i)?.[1] ||
    content.match(/\{[\s\S]*\}/)?.[0] ||
    "{}"
  );
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function cleanArray(value: unknown, maxItems: number) {
  return Array.isArray(value)
    ? value.map(cleanText).filter(Boolean).slice(0, maxItems)
    : [];
}

function structuredDescriptionToDisplayText(
  structured: StructuredWebsiteDescription,
  language: "zh" | "en"
) {
  if (language === "zh") {
    return `${structured.purpose.zh} 内容：${structured.content.zh.join("、")}。受众：${structured.audience.zh.join("、")}。`;
  }

  return `${structured.purpose.en} Content: ${structured.content.en.join(", ")}. Audience: ${structured.audience.en.join(", ")}.`;
}

function buildFallbackDescription({
  title,
  url,
  page,
  kind,
  existingDescription,
  language,
  structured = false,
}: {
  title: string;
  url: string;
  page: PageContext;
  kind: string;
  existingDescription?: string;
  language?: string;
  structured?: boolean;
}): GeneratedDescription {
  const host = page.host ? ` (${page.host})` : "";
  const source = page.reachable
    ? page.description || page.text?.slice(0, 240) || existingDescription || title
    : existingDescription || page.error || "The page could not be reached.";
  const languageHint = language ? `, primary technology language: ${language}` : "";
  const structured_description = structured
    ? buildFallbackStructuredDescription(title, url, host, source)
    : undefined;

  const description_zh = structured_description
    ? structuredDescriptionToDisplayText(structured_description, "zh")
    : `${title}${host} 是一个 ${kind}。当前摘要基于${page.reachable ? "可访问网页内容" : "标题、URL 和已有元数据"}生成${languageHint}。用途、内容和服务人群需要在配置 AI 模型后进一步细化。参考信息：${source}`;
  const description_en = structured_description
    ? structuredDescriptionToDisplayText(structured_description, "en")
    : `${title}${host} is a ${kind}. This summary is based on ${page.reachable ? "reachable webpage content" : "the title, URL, and existing metadata"}${languageHint}. Its purpose, content, and target audience should be refined further once an AI model is configured. Reference: ${source}`;

  return {
    description_zh,
    description_en,
    structured_description,
    description_metadata: {
      ...baseMetadata(page),
      prompt_template: structured ? BOOKMARK_DESCRIPTION_PROMPT_ID : undefined,
      schema_version: structured ? BOOKMARK_DESCRIPTION_SCHEMA_VERSION : undefined,
      structured_description,
      fallback: true,
    },
  };
}

function buildFallbackStructuredDescription(
  title: string,
  url: string,
  host: string,
  source: string
): StructuredWebsiteDescription {
  const subject = `${title}${host}`.trim();
  return {
    purpose: {
      zh: `${subject} 的网站用途摘要`,
      en: `Website purpose summary for ${subject || url}`,
    },
    content: {
      zh: ["网站标题与URL", "页面元数据", source.slice(0, 80)],
      en: ["Site title and URL", "Page metadata", source.slice(0, 80)],
    },
    audience: {
      zh: ["收藏该链接的用户", "需要快速理解网站价值的人"],
      en: ["Users who saved this link", "People evaluating the site's value"],
    },
  };
}

function withFallbackError(fallback: GeneratedDescription, error: any): GeneratedDescription {
  return {
    ...fallback,
    description_metadata: {
      ...fallback.description_metadata,
      fallback: true,
      error: error.message || "AI generation failed",
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
