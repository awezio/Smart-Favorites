import { callLLM } from "@/lib/rag/rag-engine";
import { LLMProvider } from "@/types";

const DEFAULT_PROVIDER = (process.env.DEFAULT_LLM_PROVIDER || "deepseek") as LLMProvider;

const ENV_API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  kimi: process.env.KIMI_API_KEY,
  qwen: process.env.QWEN_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  glm: process.env.GLM_API_KEY,
};

export async function generateBookmarkDescription(
  url: string,
  title: string
): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const pageResponse = await fetch(jinaUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(15000),
    });

    let content = "";
    if (pageResponse.ok) {
      const text = await pageResponse.text();
      content = text.slice(0, 2000);
    }

    if (!content) {
      return "";
    }

    const provider = DEFAULT_PROVIDER;
    const apiKey = ENV_API_KEYS[provider] || "";

    const prompt = `请用1-2句话描述这个网页的主要内容。\n\n网页标题：${title}\n\n网页内容摘要：${content}\n\n描述：`;

    const description = await callLLM(
      [{ role: "user", content: prompt }],
      provider,
      apiKey
    );

    return description.trim();
  } catch {
    return "";
  }
}
