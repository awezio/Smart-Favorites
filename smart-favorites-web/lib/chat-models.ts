import type { LLMProvider } from "@/types";

export type ChatModelOption = {
  id: string;
  label: string;
  webSearch?: boolean;
  vision?: boolean;
};

export type ChatProviderOption = {
  id: LLMProvider;
  name: string;
  models: ChatModelOption[];
};

export const CHAT_PROVIDER_OPTIONS: ChatProviderOption[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [{ id: "deepseek-chat", label: "DeepSeek Chat" }],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", vision: true },
      { id: "gpt-4o", label: "GPT-4o", vision: true },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    models: [
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", vision: true },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    models: [{ id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", vision: true }],
  },
  {
    id: "qwen",
    name: "Qwen",
    models: [{ id: "qwen-plus", label: "Qwen Plus" }],
  },
  {
    id: "kimi",
    name: "Kimi",
    models: [{ id: "moonshot-v1-8k", label: "Moonshot v1" }],
  },
  {
    id: "glm",
    name: "GLM",
    models: [{ id: "glm-4", label: "GLM-4" }],
  },
];

function findModel(provider: LLMProvider | "", modelId?: string) {
  const providerOption = CHAT_PROVIDER_OPTIONS.find((item) => item.id === provider);
  if (!providerOption) {
    return null;
  }

  return modelId
    ? providerOption.models.find((model) => model.id === modelId) || null
    : providerOption.models[0] || null;
}

export function supportsWebSearch(provider: LLMProvider | "", modelId?: string) {
  return Boolean(findModel(provider, modelId)?.webSearch);
}

export function supportsVision(provider: LLMProvider | "", modelId?: string) {
  return Boolean(findModel(provider, modelId)?.vision);
}
