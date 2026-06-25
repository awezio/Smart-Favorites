import type { CitationRef, SearchResult } from "@/types";
import { getSourceKey } from "@/lib/chat/session-sources";

const CITATION_PATTERN = /\[(\d{1,2})\]/g;

export function parseCitationsFromAnswer(
  answer: string,
  sources: SearchResult[]
): CitationRef[] {
  const maxIndex = sources.length;
  const seen = new Set<number>();
  const citations: CitationRef[] = [];

  for (const match of answer.matchAll(CITATION_PATTERN)) {
    const index = Number(match[1]);
    if (!Number.isFinite(index) || index < 1 || index > maxIndex || seen.has(index)) {
      continue;
    }
    seen.add(index);
    const source = sources[index - 1];
    citations.push({
      index,
      sourceKey: getSourceKey(source),
      usedInAnswer: true,
    });
  }

  return citations;
}

export function stripInvalidCitations(answer: string, maxIndex: number): string {
  return answer.replace(CITATION_PATTERN, (full, rawIndex) => {
    const index = Number(rawIndex);
    if (index >= 1 && index <= maxIndex) {
      return full;
    }
    return "";
  });
}
