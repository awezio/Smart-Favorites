import type { DocumentChunk } from "@/lib/file-parsers/types";

type SplitOptions = {
  chunkSize?: number;
  overlapSize?: number;
  separator?: string;
};

const DEFAULT_SEPARATOR = "\n\n";

export function splitIntoChunks(
  text: string,
  options: SplitOptions = {}
): DocumentChunk[] {
  const {
    chunkSize = 800,
    overlapSize = 200,
    separator = DEFAULT_SEPARATOR,
  } = options;

  const paragraphs = text.split(separator);
  const chunks: DocumentChunk[] = [];

  let bufferText = "";
  let bufferStart = 0;
  let bufferEnd = 0;
  let cursor = 0;

  for (const paragraph of paragraphs) {
    const paraStart = cursor;
    const paraEnd = paraStart + paragraph.length;
    cursor = paraEnd + separator.length;

    const bufferWasEmpty = bufferText.length === 0;
    const candidateText = bufferText
      ? `${bufferText}${separator}${paragraph}`
      : paragraph;

    if (bufferText && estimateTokens(candidateText) > chunkSize) {
      chunks.push(toChunk(bufferText, chunks.length, bufferStart, bufferEnd));

      const overlapChars = Math.min(bufferText.length, overlapSize * 4);
      const overlapStart = Math.max(bufferEnd - overlapChars, bufferStart);

      bufferText = text.slice(overlapStart, bufferEnd);
      bufferStart = overlapStart;
      bufferEnd = bufferEnd;

      bufferText = bufferText
        ? `${bufferText}${separator}${paragraph}`
        : paragraph;
      bufferEnd = paraEnd;
      continue;
    }

    bufferText = candidateText;
    if (bufferWasEmpty) {
      bufferStart = paraStart;
    }
    bufferEnd = paraEnd;
  }

  if (bufferText.trim()) {
    chunks.push(toChunk(bufferText, chunks.length, bufferStart, bufferEnd));
  }

  return chunks;
}

function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function toChunk(
  content: string,
  index: number,
  start: number,
  end: number
): DocumentChunk {
  return {
    content,
    chunk_index: index,
    char_start_pos: start,
    char_end_pos: end,
    estimated_token_count: estimateTokens(content),
  };
}
