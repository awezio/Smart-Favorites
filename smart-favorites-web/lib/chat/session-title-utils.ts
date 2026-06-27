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

function normalizeTitleCompare(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripEllipsis(value: string): string {
  return value.replace(/…$/u, "").trim();
}

export function isFallbackSessionTitle(
  title: string,
  firstUserContent: string | undefined
): boolean {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || !firstUserContent) {
    return false;
  }

  const userText = firstUserContent.replace(/\n+/g, " ").trim();
  if (!userText) {
    return false;
  }

  const normalizedTitle = normalizeTitleCompare(stripEllipsis(trimmedTitle));
  const normalizedUser = normalizeTitleCompare(userText);

  if (normalizedTitle === normalizedUser) {
    return true;
  }

  if (
    normalizedUser.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedUser.slice(0, Math.min(normalizedUser.length, 24)))
  ) {
    return true;
  }

  return false;
}

export function shouldRegenerateSessionTitle(
  title: string,
  _titleStatus: string | null | undefined,
  _metadata: unknown,
  _firstUserContent: string | undefined
): boolean {
  return isPlaceholderSessionTitle(title);
}
