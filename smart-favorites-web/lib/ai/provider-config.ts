import "server-only";

import type { ChatModelOption } from "@/lib/chat-models";
import {
  PROVIDER_MAP,
  getProviderDefinition,
  isSupportedProvider,
  type ProviderDefinition,
} from "@/lib/ai/provider-registry";
import type { LLMMessage, LLMResponse } from "@/types";

export type ProviderStyle =
  | "openai"
  | "anthropic"
  | "gemini"
  | "cohere"
  | "azure-openai"
  | "vertex-openai"
  | "bedrock-converse"
  | "ollama";

export type ProviderConfig = {
  baseURL: string;
  defaultModel: string;
  style: ProviderStyle;
  envKey?: string;
};

export const PROVIDER_ENDPOINTS: Record<string, ProviderConfig> = Object.fromEntries(
  Object.values(PROVIDER_MAP).map((provider) => [
    provider.id,
    {
      baseURL: getResolvedBaseURL(provider),
      defaultModel: provider.defaultModel,
      style: provider.protocol === "openai-compatible" ? "openai" : provider.protocol,
      envKey: provider.envKey,
    },
  ])
);

export { getProviderDefinition, isSupportedProvider };

export function getEnvProviderConfigured(provider: string) {
  const definition = getProviderDefinition(provider);
  if (!definition) return false;

  if (definition.protocol === "ollama") {
    return Boolean(process.env.OLLAMA_BASE_URL);
  }

  if (definition.protocol === "bedrock-converse") {
    return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }

  return Boolean(definition.envKey && process.env[definition.envKey]);
}

export function getEnvProviderKey(provider: string) {
  const definition = getProviderDefinition(provider);
  return definition?.envKey ? process.env[definition.envKey] || "" : "";
}

export function getResolvedBaseURL(definition: ProviderDefinition) {
  const envBase =
    process.env[`${definition.id.toUpperCase()}_BASE_URL`] ||
    (definition.id === "custom_openai" ? process.env.CUSTOM_OPENAI_BASE_URL : "") ||
    (definition.id === "azure_openai" ? process.env.AZURE_OPENAI_BASE_URL : "") ||
    (definition.id === "vertex_ai" ? process.env.VERTEX_AI_BASE_URL : "") ||
    (definition.id === "ollama" ? process.env.OLLAMA_BASE_URL : "");

  return (envBase || definition.baseURL).replace(/\/$/, "");
}

function modelLabel(modelId: string) {
  return modelId
    .replace(/^models\//, "")
    .split(/[-_:/]/)
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

function authHeaders(definition: ProviderDefinition, apiKey: string): Record<string, string> {
  if (definition.authType === "none") return {};
  if (definition.authType === "x-api-key") return { "x-api-key": apiKey };
  if (definition.authType === "google-api-key") return {};
  if (definition.authType === "github-oauth") return { "X-GitHub-Token": apiKey };
  return { Authorization: `Bearer ${apiKey}` };
}

function ensureConfigured(definition: ProviderDefinition, apiKey: string, baseURL: string) {
  if (definition.protocol !== "ollama" && definition.authType !== "none" && !apiKey) {
    if (definition.authType === "github-oauth") {
      throw new Error(`请先使用 GitHub 登录授权 ${definition.name}`);
    }
    throw new Error(`未找到 ${definition.name} 的 API Key`);
  }

  if (!baseURL && definition.protocol !== "bedrock-converse") {
    throw new Error(`${definition.name} 需要配置 Base URL`);
  }
}

export async function fetchProviderModels(
  provider: string,
  apiKey: string
): Promise<ChatModelOption[]> {
  const definition = getProviderDefinition(provider);
  if (!definition) throw new Error("Invalid provider");

  const baseURL = getResolvedBaseURL(definition);
  ensureConfigured(definition, apiKey, baseURL);

  if (!definition.capabilities.models) {
    return definition.fallbackModels;
  }

  if (definition.protocol === "bedrock-converse") {
    return definition.fallbackModels;
  }

  if (definition.protocol === "ollama") {
    const response = await fetch(`${baseURL}${definition.modelsEndpoint}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`API 错误 (${response.status})`);
    const data = await response.json();
    return uniqueModels(
      (data.models || []).map((item: any) => ({ id: item.name, label: item.name }))
    );
  }

  if (definition.protocol === "gemini") {
    const response = await fetch(`${baseURL}${definition.modelsEndpoint}?key=${apiKey}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`API 错误 (${response.status})`);
    const data = await response.json();
    return uniqueModels(
      (data.models || [])
        .filter((item: any) => (item.supportedGenerationMethods || []).includes("generateContent"))
        .map((item: any) => {
          const id = String(item.name || "").replace(/^models\//, "");
          return { id, label: item.displayName || modelLabel(id), vision: id.includes("gemini") };
        })
    );
  }

  const response = await fetch(`${baseURL}${definition.modelsEndpoint}`, {
    headers: authHeaders(definition, apiKey),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`API 错误 (${response.status})`);

  const data = await response.json();
  const items = data.data || data.models || [];
  return uniqueModels(
    items.map((item: any) => {
      const id = String(item.id || item.name || "").replace(/^models\//, "");
      return {
        id,
        label: item.display_name || item.displayName || modelLabel(id),
        vision: id.includes("vision") || id.includes("gpt-4o") || id.includes("gemini"),
      };
    })
  );
}

function toProviderMessages(messages: LLMMessage[]) {
  return messages.map((message) => ({
    role: message.role === "system" ? "system" : message.role,
    content: message.content,
  }));
}

export async function callProviderChat({
  provider,
  apiKey,
  messages,
  model,
  maxTokens = 800,
}: {
  provider: string;
  apiKey: string;
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const definition = getProviderDefinition(provider);
  if (!definition) throw new Error("Invalid provider");

  const baseURL = getResolvedBaseURL(definition);
  ensureConfigured(definition, apiKey, baseURL);
  const selectedModel = model || definition.defaultModel;
  const start = Date.now();

  if (definition.protocol === "bedrock-converse") {
    throw new Error("Amazon Bedrock requires AWS SigV4 runtime configuration before chat calls.");
  }

  if (definition.protocol === "ollama") {
    const response = await fetch(`${baseURL}${definition.chatEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: toProviderMessages(messages),
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`API 错误 (${response.status})`);
    const data = await response.json();
    return {
      content: data.message?.content || data.response || "",
      model: selectedModel,
      usage: data.usage,
    };
  }

  if (definition.protocol === "anthropic") {
    const system = messages.find((message) => message.role === "system")?.content;
    const anthropicMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content }));
    const response = await fetch(`${baseURL}${definition.chatEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        ...authHeaders(definition, apiKey),
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: maxTokens,
        system,
        messages: anthropicMessages,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`API 错误 (${response.status}): ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    const text = (data.content || []).map((part: any) => part.text || "").join("");
    return { content: text, model: selectedModel, usage: data.usage };
  }

  if (definition.protocol === "gemini") {
    const response = await fetch(
      `${baseURL}${definition.chatEndpoint.replace("{model}", selectedModel)}?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages
            .filter((message) => message.role !== "system")
            .map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
          systemInstruction: messages.find((message) => message.role === "system")
            ? { parts: [{ text: messages.find((message) => message.role === "system")!.content }] }
            : undefined,
          generationConfig: { maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );
    if (!response.ok) throw new Error(`API 错误 (${response.status}): ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    const content = (data.candidates?.[0]?.content?.parts || [])
      .map((part: any) => part.text || "")
      .join("");
    return { content, model: selectedModel, usage: data.usageMetadata };
  }

  if (definition.protocol === "cohere") {
    const response = await fetch(`${baseURL}${definition.chatEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(definition, apiKey),
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: toProviderMessages(messages),
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`API 错误 (${response.status}): ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    const content = Array.isArray(data.message?.content)
      ? data.message.content.map((part: any) => part.text || "").join("")
      : data.text || "";
    return { content, model: selectedModel, usage: data.usage };
  }

  const response = await fetch(
    `${baseURL}${definition.chatEndpoint.replace("{model}", encodeURIComponent(selectedModel))}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(definition, apiKey),
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: toProviderMessages(messages),
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  const latency = Date.now() - start;
  if (!response.ok) {
    throw new Error(`API 错误 (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || data.output_text || "",
    model: data.model || selectedModel,
    usage: data.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens || data.usage.input_tokens || 0,
          completion_tokens: data.usage.completion_tokens || data.usage.output_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export async function testProviderConnection(provider: string, apiKey: string, model?: string) {
  const definition = getProviderDefinition(provider);
  if (!definition) throw new Error("Invalid provider");

  const start = Date.now();

  if (definition.protocol === "bedrock-converse") {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("Amazon Bedrock requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
    }
    return { success: true, latency: Date.now() - start, model: model || definition.defaultModel };
  }

  const result = await callProviderChat({
    provider,
    apiKey,
    model: model || definition.defaultModel,
    messages: [{ role: "user", content: "Hi" }],
    maxTokens: 10,
  });

  return {
    success: true,
    latency: Date.now() - start,
    model: result.model,
  };
}
