import "server-only";

import {
  getProviderDefinition,
  getResolvedBaseURL,
} from "@/lib/ai/provider-config";
import {
  type ChatStreamEvent,
  isStreamingProtocol,
} from "@/lib/ai/chat-stream-shared";
import type { LLMMessage } from "@/types";

export type { ChatStreamEvent };

function toProviderMessages(messages: LLMMessage[]) {
  return messages.map((message) => ({
    role: message.role === "system" ? "system" : message.role,
    content: message.content,
  }));
}

export async function* streamProviderChat({
  provider,
  apiKey,
  messages,
  model,
  maxTokens = 800,
  timeoutMs = 300_000,
}: {
  provider: string;
  apiKey: string;
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): AsyncGenerator<ChatStreamEvent> {
  const definition = getProviderDefinition(provider);
  if (!definition || !isStreamingProtocol(definition.protocol)) {
    yield { type: "error", message: "Streaming is not supported for this provider." };
    return;
  }

  const baseURL = getResolvedBaseURL(definition);
  const selectedModel = model || definition.defaultModel;

  const response = await fetch(
    `${baseURL}${definition.chatEndpoint.replace("{model}", encodeURIComponent(selectedModel))}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: toProviderMessages(messages),
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );

  if (!response.ok || !response.body) {
    const body = (await response.text()).slice(0, 500);
    yield { type: "error", message: `API error (${response.status}): ${body}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let resolvedModel = selectedModel;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.model) {
            resolvedModel = parsed.model;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            yield { type: "delta", content: delta };
          }
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done", model: resolvedModel };
}

export function formatSseEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
