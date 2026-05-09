export async function generateBookmarkDescription(
  url: string,
  title?: string
): Promise<string> {
  const safeTitle = title && title.trim() ? title.trim() : "this page";
  const hostname = safeHost(url);

  if (hostname) {
    return `Bookmark for ${safeTitle} on ${hostname}.`;
  }

  return `Bookmark for ${safeTitle}.`;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
