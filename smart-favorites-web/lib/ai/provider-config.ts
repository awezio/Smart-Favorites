import "server-only";

import type { LLMProvider } from "@/types";
import type { ChatModelOption } from "@/lib/chat-models";

export type ProviderStyle = "openai" | "anthropic" | "gemini" | "ollama";

export type ProviderConfig = {
  baseURL: string;
  defaultModel: string;
  style: ProviderStyle;
  envKey?: string;
};

export const PROVIDER_ENDPOINTS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    style: "openai",
    envKey: "OPENAI_API_KEY",
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    style: "openai",
    envKey: "DEEPSEEK_API_KEY",
  },
  kimi: {
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    style: "openai",
    envKey: "KIMI_API_KEY",
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
    style: "openai",
    envKey: "QWEN_API_KEY",
  },
  claude: {
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    style: "anthropic",
    envKey: "CLAUDE_API_KEY",
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-1.5-flash",
    style: "gemini",
    envKey: "GEMINI_API_KEY",
  },
  glm: {
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    style: "openai",
    envKey: "GLM_API_KEY",
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    defaultModel: "llama3.1",
    style: "ollama",
  },
};

export function isSupportedProvider(provider: string): provider is LLMProvider {
  return provider in PROVIDER_ENDPOINTS;
}

export function getEnvProviderConfigured(provider: LLMProvider) {
  const config = PROVIDER_ENDPOINTS[provider];
  if (config.style === "ollama") {
    return Boolean(process.env.OLLAMA_BASE_URL);
  }

  return Boolean(config.envKey && process.env[config.envKey]);
}

export function getEnvProviderKey(provider: LLMProvider) {
  const envKey = PROVIDER_ENDPOINTS[provider].envKey;
  return envKey ? process.env[envKey] || "" : "";
}

function modelLabel(modelId: string) {
  return modelId
    .replace(/^models\//, "")
    .split(/[-_:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueModels(models: ChatModelOption[]) {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (!model.id || seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
}

export async function fetchProviderModels(
  provider: LLMProvider,
  apiKey: string
): Promise<ChatModelOption[]> {
  const config = PROVIDER_ENDPOINTS[provider];

  if (config.style !== "ollama" && !apiKey) {
    throw new Error(`未找到 ${provider} 的 API Key`);
  }

  if (config.style === "anthropic") {
    const response = await fetch(`${config.baseURL}/models`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API 错误 (${response.status})`);
    }

    const data = await response.json();
    return uniqueModels(
      (data.data || []).map((item: any) => ({
        id: item.id,
        label: item.display_name || modelLabel(item.id),
      }))
    );
  }

  if (config.style === "gemini") {
    const response = await fetch(`${config.baseURL}/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API 错误 (${response.status})`);
    }

    const data = await response.json();
    return uniqueModels(
      (data.models || [])
        .filter((item: any) =>
          (item.supportedGenerationMethods || []).includes("generateContent")
        )
        .map((item: any) => {
          const id = String(item.name || "").replace(/^models\//, "");
          return {
            id,
            label: item.displayName || modelLabel(id),
            vision: id.includes("gemini"),
          };
        })
    );
  }

  if (config.style === "ollama") {
    const response = await fetch(`${config.baseURL}/api/tags`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API 错误 (${response.status})`);
    }

    const data = await response.json();
    return uniqueModels(
      (data.models || []).map((item: any) => ({
        id: item.name,
        label: item.name,
      }))
    );
  }

  const response = await fetch(`${config.baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`API 错误 (${response.status})`);
  }

  const data = await response.json();
  return uniqueModels(
    (data.data || []).map((item: any) => ({
      id: item.id,
      label: modelLabel(item.id),
      vision:
        typeof item.id === "string" &&
        (item.id.includes("vision") || item.id.includes("gpt-4o")),
    }))
  );
}
