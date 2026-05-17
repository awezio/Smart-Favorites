export interface DocumentChunk {
  text: string;
  index: number;
  page?: number;
}

export interface ParsedDocument {
  title: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: Record<string, any>;
}
export type DocumentChunk = {
  content: string;
  chunk_index: number;
  char_start_pos: number;
  char_end_pos: number;
  estimated_token_count: number;
  page_number?: number;
  section_title?: string;
};

export type ParsedDocument = {
  title: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: {
    pageCount?: number;
    wordCount: number;
    language?: string;
  };
};
