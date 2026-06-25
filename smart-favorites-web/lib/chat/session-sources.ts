import type { ChatMessage, SearchResult } from "@/types";

export type AggregatedSessionSource = SearchResult & {
  sourceKey: string;
  sourceIndex: number;
  messageTimestamps: string[];
};

export function getSourceKey(source: SearchResult): string {
  return `${source.type}:${source.id}`;
}

export function aggregateSessionSources(messages: ChatMessage[]): AggregatedSessionSource[] {
  const merged = new Map<string, AggregatedSessionSource>();
  let index = 1;

  for (const message of messages) {
    if (message.role !== "assistant" || !message.sources?.length) {
      continue;
    }

    for (const source of message.sources) {
      const sourceKey = getSourceKey(source);
      const existing = merged.get(sourceKey);
      if (existing) {
        if (message.timestamp && !existing.messageTimestamps.includes(message.timestamp)) {
          existing.messageTimestamps.push(message.timestamp);
        }
        if (source.similarity > existing.similarity) {
          existing.similarity = source.similarity;
        }
        continue;
      }

      merged.set(sourceKey, {
        ...source,
        sourceKey,
        sourceIndex: index++,
        messageTimestamps: message.timestamp ? [message.timestamp] : [],
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
}

export function getSourceTitle(source: SearchResult, locale: "zh" | "en" = "zh"): string {
  if (source.bookmark?.title) return source.bookmark.title;
  if (source.star) return `${source.star.owner}/${source.star.repo}`;
  if (source.document?.title) return source.document.title;
  return locale === "zh" ? "来源" : "Source";
}

export function getSourceUrl(source: SearchResult): string {
  return source.bookmark?.url || source.star?.url || "";
}

export function getSourceSnippet(source: SearchResult, locale: "zh" | "en" = "zh"): string {
  if (source.bookmark) {
    const description =
      locale === "zh"
        ? source.bookmark.description_zh || source.bookmark.description || source.bookmark.description_en
        : source.bookmark.description_en || source.bookmark.description || source.bookmark.description_zh;
    return description || source.bookmark.url || "";
  }

  if (source.star) {
    const description =
      locale === "zh"
        ? source.star.description_zh || source.star.description || source.star.description_en
        : source.star.description_en || source.star.description || source.star.description_zh;
    return description || source.star.url || "";
  }

  if (source.document) {
    return source.document.content?.slice(0, 240) || source.document.title || "";
  }

  return "";
}

export function exportSourcesAsMarkdown(
  sessionTitle: string,
  sources: AggregatedSessionSource[],
  locale: "zh" | "en" = "zh"
): string {
  const heading = locale === "zh" ? "会话引用来源" : "Session sources";
  const lines = [
    `# ${heading}: ${sessionTitle}`,
    "",
    `> ${locale === "zh" ? "导出时间" : "Exported"}: ${new Date().toISOString()}`,
    "",
  ];

  for (const source of sources) {
    const title = getSourceTitle(source, locale);
    const url = getSourceUrl(source);
    const snippet = getSourceSnippet(source, locale);
    lines.push(`## [${source.sourceIndex}] ${title}`);
    if (url) lines.push(`- URL: ${url}`);
    lines.push(`- Type: ${source.type}`);
    lines.push(`- Similarity: ${Math.round((source.similarity || 0) * 100)}%`);
    if (snippet) {
      lines.push("", snippet);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportSourcesAsJson(
  sessionId: string,
  sessionTitle: string,
  sources: AggregatedSessionSource[]
) {
  return {
    sessionId,
    sessionTitle,
    exportedAt: new Date().toISOString(),
    sourceCount: sources.length,
    sources: sources.map((source) => ({
      index: source.sourceIndex,
      sourceKey: source.sourceKey,
      type: source.type,
      id: source.id,
      similarity: source.similarity,
      title: getSourceTitle(source),
      url: getSourceUrl(source) || null,
      snippet: getSourceSnippet(source),
      bookmark: source.bookmark || null,
      star: source.star || null,
      document: source.document || null,
      messageTimestamps: source.messageTimestamps,
    })),
  };
}
