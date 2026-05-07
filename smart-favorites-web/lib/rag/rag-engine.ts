import { searchAll } from "@/lib/rag/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { Bookmark, GitHubStar, Note, LLMMessage, LLMProvider, SearchResult } from "@/types";

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  kimi: "https://api.moonshot.cn/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  glm: "https://open.bigmodel.cn/api/paas/v4",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  kimi: "moonshot-v1-8k",
  qwen: "qwen-turbo",
  claude: "claude-3-5-sonnet-20241022",
  gemini: "gemini-1.5-flash",
  glm: "glm-4-flash",
  ollama: "llama3",
};

const ENV_API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  kimi: process.env.KIMI_API_KEY,
  qwen: process.env.QWEN_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  glm: process.env.GLM_API_KEY,
};
// Keep note snippets concise so prompt context remains focused.
const MAX_NOTE_CONTENT_LENGTH = 400;

async function getUserSettings(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("default_llm_provider, api_keys")
    .eq("user_id", userId)
    .single();
  return data;
}

async function callOpenAICompatible(
  messages: LLMMessage[],
  baseURL: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error (${baseURL}): ${err}`);
  }

  const json = await response.json();
  return json.choices[0].message.content as string;
}

interface AnthropicMessage {
  role: string;
  content: string;
}

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
}

async function callAnthropic(
  messages: LLMMessage[],
  apiKey: string,
  model: string
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages: AnthropicMessage[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: AnthropicRequestBody = {
    model,
    max_tokens: 2048,
    messages: userMessages,
  };
  if (systemMsg) body.system = systemMsg.content;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const json = await response.json();
  return json.content[0].text as string;
}

async function callGemini(
  messages: LLMMessage[],
  apiKey: string,
  model: string
): Promise<string> {
  const contents: GeminiContent[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemMsg = messages.find((m) => m.role === "system");
  const body: GeminiRequestBody = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const json = await response.json();
  return json.candidates[0].content.parts[0].text as string;
}

export async function callLLM(
  messages: LLMMessage[],
  provider: LLMProvider,
  apiKey: string,
  model?: string
): Promise<string> {
  const resolvedModel = model || DEFAULT_MODELS[provider] || "gpt-4o-mini";

  if (provider === "claude") {
    return callAnthropic(messages, apiKey, resolvedModel);
  }

  if (provider === "gemini") {
    return callGemini(messages, apiKey, resolvedModel);
  }

  // Resolve base URL exclusively from server-side config (no user-supplied URLs)
  const resolvedBaseURL =
    provider === "ollama"
      ? `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/v1`
      : PROVIDER_BASE_URLS[provider];

  if (!resolvedBaseURL) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  return callOpenAICompatible(messages, resolvedBaseURL, apiKey, resolvedModel);
}

function buildBookmarkLine(index: number, b: Bookmark): string {
  const desc = b.description ? `\n描述: ${b.description}` : "";
  const folder = b.folder_path ? `\n文件夹: ${b.folder_path}` : "";
  return `[${index}] 书签: ${b.title}\nURL: ${b.url}${desc}${folder}`;
}

function buildStarLine(index: number, g: GitHubStar): string {
  const desc = g.description ? `\n描述: ${g.description}` : "";
  const lang = g.language ? `\n语言: ${g.language}` : "";
  return `[${index}] GitHub Star: ${g.owner}/${g.repo}\nURL: ${g.url}${desc}${lang}`;
}

function buildNoteLine(index: number, n: Note): string {
  const tags = n.tags?.length ? `\n标签: ${n.tags.join(", ")}` : "";
  const src = n.source_url ? `\n来源: ${n.source_url}` : "";
  const isTruncated = n.content.length > MAX_NOTE_CONTENT_LENGTH;
  const preview =
    n.content.slice(0, MAX_NOTE_CONTENT_LENGTH) + (isTruncated ? "…（已截断）" : "");
  return `[${index}] 笔记: ${n.title}\n${preview}${tags}${src}`;
}

function buildContext(sources: SearchResult[]): string {
  return sources
    .map((s, i) => {
      if (s.type === "bookmark" && s.bookmark) return buildBookmarkLine(i + 1, s.bookmark);
      if (s.type === "star" && s.star) return buildStarLine(i + 1, s.star);
      if (s.type === "note" && s.note) return buildNoteLine(i + 1, s.note);
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function ragChat(
  query: string,
  chatHistory: LLMMessage[] = [],
  topK: number = 5,
  userId?: string,
  providerOverride?: LLMProvider,
  modelOverride?: string
): Promise<{ answer: string; sources: SearchResult[] }> {
  const sources = await searchAll(query, topK, 0.3, userId);
  const context = buildContext(sources);

  const systemPrompt =
    `你是一个智能收藏夹助手。根据以下用户收藏内容回答问题，并在回答中标注来源（使用[序号]格式）。` +
    `如果找不到相关内容，说明知识库中暂无相关内容。\n\n收藏内容：\n${context || "（暂无相关收藏）"}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: query },
  ];

  // Resolve provider and API key
  let provider: LLMProvider =
    providerOverride ||
    ((process.env.DEFAULT_LLM_PROVIDER || "deepseek") as LLMProvider);
  let apiKey = ENV_API_KEYS[provider] || "";
  let model = modelOverride;

  if (userId && !providerOverride) {
    const settings = await getUserSettings(userId);
    if (settings) {
      provider = (settings.default_llm_provider as LLMProvider) || provider;
      const userKeys = (settings.api_keys as Record<string, string>) || {};
      apiKey = userKeys[provider] || ENV_API_KEYS[provider] || "";
    }
  }

  const answer = await callLLM(messages, provider, apiKey, model);

  return { answer, sources };
}
