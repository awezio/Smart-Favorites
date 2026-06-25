const DEFAULT_PLACEHOLDER_TITLES = new Set([
  "新会话",
  "New session",
  "未命名会话",
  "Untitled session",
]);

export function isPlaceholderSessionTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  if (DEFAULT_PLACEHOLDER_TITLES.has(trimmed)) return true;
  if (/^(对话|Conversation)\s/.test(trimmed)) return true;
  return false;
}
