import { splitIntoChunks } from "@/lib/file-parsers/chunk-splitter";
import type { ParsedDocument } from "@/lib/file-parsers/types";

export async function parseTextFile(
  file: Blob,
  fileName?: string
): Promise<ParsedDocument> {
  const content = await file.text();
  const title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Untitled";
  const chunks = splitIntoChunks(content);

  return {
    title,
    content,
    chunks,
    metadata: {
      wordCount: countWords(content),
    },
  };
}

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}
