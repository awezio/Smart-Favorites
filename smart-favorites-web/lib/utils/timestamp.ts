/**
 * Parse Netscape bookmark ADD_DATE (Unix seconds or milliseconds) or ISO strings
 * into PostgreSQL-compatible ISO 8601 timestamps.
 */
export function parseNetscapeTimestamp(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  const seconds = numeric > 9_999_999_999 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}
