import { LLMProvider } from "@/types";

export interface ProviderModel {
  id: string;
  name: string;
}

export interface ChatProviderOption {
  id: LLMProvider;
  name: string;
  models: ProviderModel[];
}

export const CHAT_PROVIDER_OPTIONS: ChatProviderOption[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-4", name: "GPT-4" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    models: [
      { id: "moonshot-v1-8k", name: "Moonshot v1 8K" },
      { id: "moonshot-v1-32k", name: "Moonshot v1 32K" },
      { id: "moonshot-v1-128k", name: "Moonshot v1 128K" },
    ],
  },
  {
    id: "qwen",
    name: "通义千问 (Qwen)",
    models: [
      { id: "qwen-turbo", name: "Qwen Turbo" },
      { id: "qwen-plus", name: "Qwen Plus" },
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-long", name: "Qwen Long" },
    ],
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B" },
    ],
  },
  {
    id: "glm",
    name: "智谱 GLM",
    models: [
      { id: "glm-4-flash", name: "GLM-4 Flash" },
      { id: "glm-4", name: "GLM-4" },
      { id: "glm-4-plus", name: "GLM-4 Plus" },
      { id: "glm-4-air", name: "GLM-4 Air" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (本地)",
    models: [
      { id: "llama3", name: "LLaMA 3" },
      { id: "llama3.1", name: "LLaMA 3.1" },
      { id: "mistral", name: "Mistral" },
      { id: "qwen2", name: "Qwen2" },
      { id: "deepseek-r1", name: "DeepSeek R1" },
      { id: "phi3", name: "Phi-3" },
    ],
  },
];

const WEB_SEARCH_MODELS: Record<string, string[]> = {
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
};

const VISION_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  claude: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"],
};

export function supportsWebSearch(provider: LLMProvider, modelId: string): boolean {
  return WEB_SEARCH_MODELS[provider]?.includes(modelId) ?? false;
}

export function supportsVision(provider: LLMProvider, modelId: string): boolean {
  return VISION_MODELS[provider]?.includes(modelId) ?? false;
}
