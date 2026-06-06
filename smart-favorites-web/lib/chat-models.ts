import type { LLMProvider } from "@/types";
import { PROVIDER_DEFINITIONS } from "@/lib/ai/provider-registry";

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

export const CHAT_PROVIDER_OPTIONS: ChatProviderOption[] = PROVIDER_DEFINITIONS.map(
  (provider) => ({
    id: provider.id,
    name: provider.name,
    models: provider.fallbackModels,
  })
);

function findModel(provider: LLMProvider | "", modelId?: string) {
  const providerOption = CHAT_PROVIDER_OPTIONS.find((item) => item.id === provider);
  if (!providerOption) return null;

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
