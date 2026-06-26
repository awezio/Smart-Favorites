export function bookmarkMatchesPattern(
  bookmark: { url: string; title: string },
  pattern: string
): boolean {
  const raw = pattern.trim();
  if (!raw) {
    return false;
  }

  const haystack = `${bookmark.url} ${bookmark.title}`.toLowerCase();
  const tokens = raw
    .split(/[,|]/)
    .map((token) => token.trim().replace(/%/g, "").toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  return tokens.some((token) => haystack.includes(token));
}
