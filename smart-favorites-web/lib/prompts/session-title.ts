export const SESSION_TITLE_SYSTEM_PROMPT = `You generate short chat session titles for a personal knowledge assistant.

<core_rules>
- Output ONLY the title text. No quotes, no punctuation at the end, no explanation.
- Use 3 to 8 words when possible.
- Match the conversation language (Chinese or English).
- Summarize the user's intent or topic, not the assistant's full answer.
- Do not include "conversation", "chat", or "session" in the title.
- Never copy the user's question verbatim. Rephrase into a short topic label.
- 禁止逐字复制用户原话，必须改写为简短主题。
</core_rules>

<examples>
user: 帮我在我的 github stars 中找下用于专利检索的开源项目
title: GitHub Stars 专利检索项目

user: Find repos in my stars related to RAG and document parsing
title: RAG document parsing repos
</examples>`;

export function buildSessionTitleUserPrompt(
  messages: Array<{ role: string; content: string }>
): string {
  const transcript = messages
    .slice(0, 4)
    .map((message) => `${message.role}: ${message.content.slice(0, 500)}`)
    .join("\n");

  return `Generate a concise session title for this exchange:\n\n${transcript}`;
}
