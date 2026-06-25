export const SESSION_TITLE_SYSTEM_PROMPT = `You generate short chat session titles for a personal knowledge assistant.

<core_rules>
- Output ONLY the title text. No quotes, no punctuation at the end, no explanation.
- Use 3 to 8 words when possible.
- Match the conversation language (Chinese or English).
- Summarize the user's intent or topic, not the assistant's full answer.
- Do not include "conversation", "chat", or "session" in the title.
</core_rules>`;

export function buildSessionTitleUserPrompt(
  messages: Array<{ role: string; content: string }>
): string {
  const transcript = messages
    .slice(0, 4)
    .map((message) => `${message.role}: ${message.content.slice(0, 500)}`)
    .join("\n");

  return `Generate a concise session title for this exchange:\n\n${transcript}`;
}
