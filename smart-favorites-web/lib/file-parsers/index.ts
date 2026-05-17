import { parsePDF } from './pdf-parser';
import { parseOffice } from './office-parser';
import type { ParsedDocument } from './types';

export async function parseDocument(payload: { name?: string; buffer: Buffer; mime?: string }): Promise<ParsedDocument> {
  const name = payload.name || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  try {
    if (ext === 'pdf') return await parsePDF(payload.buffer);
    if (ext === 'docx' || ext === 'xlsx' || ext === 'xls') return await parseOffice(payload.buffer);
    // fallback: treat as text
    return {
      title: name || 'document',
      content: payload.buffer.toString('utf8'),
      chunks: (await import('./chunk-splitter')).splitIntoChunks(payload.buffer.toString('utf8')),
      metadata: { fallback: true, bytes: payload.buffer.byteLength },
    };
  } catch (err) {
    return {
      title: name || 'document',
      content: '',
      chunks: [],
      metadata: { error: String(err) },
    };
  }
}
import type { ParsedDocument } from "@/lib/file-parsers/types";
import { parseTextFile } from "@/lib/file-parsers/text-parser";
import { parseHtmlFile } from "@/lib/file-parsers/html-parser";
import { parsePdfFile } from "@/lib/file-parsers/pdf-parser";
import { parseOfficeFile } from "@/lib/file-parsers/office-parser";

export async function parseDocument(
  file: Blob,
  fileType: string,
  fileName?: string
): Promise<ParsedDocument> {
  const normalizedType = fileType.toLowerCase();
  const extension = fileName?.split(".").pop()?.toLowerCase() || "";

  if (isPdf(normalizedType, extension)) {
    return parsePdfFile(file, fileName);
  }

  if (isOffice(normalizedType, extension)) {
    return parseOfficeFile(file, fileName);
  }

  if (isHtml(normalizedType, extension)) {
    return parseHtmlFile(file, fileName);
  }

  return parseTextFile(file, fileName);
}

function isPdf(type: string, ext: string): boolean {
  return type === "application/pdf" || ext === "pdf";
}

function isOffice(type: string, ext: string): boolean {
  return (
    type.includes("officedocument") ||
    ext === "docx" ||
    ext === "xlsx" ||
    ext === "xls"
  );
}

function isHtml(type: string, ext: string): boolean {
  return type === "text/html" || ext === "html" || ext === "htm";
}
