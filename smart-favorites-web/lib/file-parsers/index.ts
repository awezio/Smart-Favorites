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
