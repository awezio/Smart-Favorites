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
