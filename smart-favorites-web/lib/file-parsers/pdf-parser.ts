import { splitIntoChunks } from "@/lib/file-parsers/chunk-splitter";
import type { ParsedDocument } from "@/lib/file-parsers/types";

export async function parsePdfFile(
  file: Blob,
  fileName?: string
): Promise<ParsedDocument> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
  const document = await pdfjs.getDocument({ data: buffer }).promise;

  let content = "";
  for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    content += `${pageText}\n\n`;
  }

  const title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Untitled";
  const chunks = splitIntoChunks(content.trim());

  return {
    title,
    content: content.trim(),
    chunks,
    metadata: {
      pageCount: document.numPages,
      wordCount: countWords(content),
    },
  };
}

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}
