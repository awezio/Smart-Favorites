import * as cheerio from "cheerio";
import { splitIntoChunks } from "@/lib/file-parsers/chunk-splitter";
import type { ParsedDocument } from "@/lib/file-parsers/types";

export async function parseHtmlFile(
  file: Blob,
  fileName?: string
): Promise<ParsedDocument> {
  const html = await file.text();
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    (fileName ? fileName.replace(/\.[^/.]+$/, "") : "Untitled");

  const text = $("body").text().replace(/\s+/g, " ").trim();
  const chunks = splitIntoChunks(text);

  return {
    title,
    content: text,
    chunks,
    metadata: {
      wordCount: countWords(text),
    },
  };
}

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}
