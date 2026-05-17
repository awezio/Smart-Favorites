import { splitIntoChunks } from './chunk-splitter';
import type { ParsedDocument } from './types';

export async function parseOffice(buffer: Buffer): Promise<ParsedDocument> {
  const text = buffer.toString('utf8').replace(/\s+/g, ' ');
  const chunks = splitIntoChunks(text);
  return {
    title: 'office-document',
    content: text,
    chunks,
    metadata: { approx: true, bytes: buffer.byteLength },
  };
}
import { splitIntoChunks } from "@/lib/file-parsers/chunk-splitter";
import type { ParsedDocument } from "@/lib/file-parsers/types";

export async function parseOfficeFile(
  file: Blob,
  fileName?: string
): Promise<ParsedDocument> {
  const extension = fileName?.split(".").pop()?.toLowerCase() || "";

  if (extension === "docx") {
    return parseDocx(file, fileName);
  }

  if (extension === "xlsx" || extension === "xls") {
    return parseXlsx(file, fileName);
  }

  throw new Error(`Unsupported office format: ${extension || "unknown"}`);
}

async function parseDocx(file: Blob, fileName?: string): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const content = result.value || "";
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

async function parseXlsx(file: Blob, fileName?: string): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return XLSX.utils.sheet_to_csv(sheet);
  });
  const content = sheets.join("\n\n");
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
