# File Parsing Guide

Smart Favorites routes uploads through `lib/file-parsers`.

## Supported Formats

- PDF: parsed by the PDF parser.
- DOCX: parsed by the Office parser.
- XLSX and XLS: parsed as spreadsheet text.
- TXT and Markdown: parsed by the text parser.
- HTML and HTM: parsed by the HTML parser.

## Processing Contract

`parseDocument(file, fileType, fileName)` returns a normalized parsed document with title, content, chunks, and metadata. Chunking should preserve enough context for RAG while keeping each chunk small enough for embedding and prompt assembly.

## Operational Notes

Large files should remain in the pending state until the cron processor finishes. Failed parsing should update `processing_error` so the UI can show a retry path.
