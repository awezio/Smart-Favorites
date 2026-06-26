import type { ChatMessage } from "@/types";

export function normalizeSessionMessages(
  messages: unknown
): Pick<ChatMessage, "role" | "content">[] {
  const rawMessages: unknown[] = (() => {
    if (Array.isArray(messages)) {
      return messages;
    }

    if (typeof messages === "string") {
      try {
        const parsed = JSON.parse(messages);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    if (messages && typeof messages === "object") {
      const maybeWrappedMessages = (messages as { messages?: unknown }).messages;
      return Array.isArray(maybeWrappedMessages) ? maybeWrappedMessages : [];
    }

    return [];
  })();

  return rawMessages
    .filter((message) => message && typeof message === "object")
    .map((message) => {
      const item = message as Partial<ChatMessage>;
      return {
        role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: typeof item.content === "string" ? item.content : "",
      };
    })
    .filter((message) => message.content.trim().length > 0);
}
