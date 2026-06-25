import { getProviderDefinition } from "@/lib/ai/provider-registry";

export type ChatStreamEvent =
  | { type: "routing"; routing: { mode: string; useKnowledge: boolean; reason: string } }
  | { type: "sources"; sources: unknown[] }
  | { type: "delta"; content: string }
  | { type: "done"; model: string; citations?: unknown[] }
  | { type: "error"; message: string };

const STREAMING_PROTOCOLS = new Set([
  "openai-compatible",
  "azure-openai",
  "vertex-openai",
]);

export function supportsProviderStreaming(provider: string): boolean {
  const definition = getProviderDefinition(provider);
  return Boolean(definition && STREAMING_PROTOCOLS.has(definition.protocol));
}

export function isStreamingProtocol(protocol: string): boolean {
  return STREAMING_PROTOCOLS.has(protocol);
}
