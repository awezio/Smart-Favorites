-- Add document chunks to the web RAG hybrid search path.
SET search_path = public, extensions;

DROP FUNCTION IF EXISTS match_document_chunks(extensions.vector, UUID, INT, FLOAT);
DROP FUNCTION IF EXISTS keyword_search_document_chunks(TEXT, UUID, INT);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding extensions.vector(384),
  user_id_param UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  user_id UUID,
  title TEXT,
  file_name TEXT,
  content TEXT,
  similarity FLOAT,
  page_number INT,
  section_title TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.user_id,
    d.title,
    d.file_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.page_number,
    dc.section_title
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.user_id = user_id_param
    AND d.user_id = user_id_param
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION keyword_search_document_chunks(
  query_text TEXT,
  filter_user_id UUID DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  user_id UUID,
  title TEXT,
  file_name TEXT,
  content TEXT,
  page_number INT,
  section_title TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_pattern TEXT := '%' || lower(query_text) || '%';
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.user_id,
    d.title,
    d.file_name,
    dc.content,
    dc.page_number,
    dc.section_title,
    CASE
      WHEN lower(d.title) = lower(query_text) THEN 1.0
      WHEN lower(d.title) LIKE search_pattern THEN 0.9
      WHEN lower(d.file_name) LIKE search_pattern THEN 0.8
      WHEN dc.section_title IS NOT NULL AND lower(dc.section_title) LIKE search_pattern THEN 0.7
      WHEN lower(dc.content) LIKE search_pattern THEN 0.5
      ELSE 0.1
    END::REAL AS rank
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    (filter_user_id IS NULL OR dc.user_id = filter_user_id)
    AND (filter_user_id IS NULL OR d.user_id = filter_user_id)
    AND (
      lower(d.title) LIKE search_pattern
      OR lower(d.file_name) LIKE search_pattern
      OR (dc.section_title IS NOT NULL AND lower(dc.section_title) LIKE search_pattern)
      OR lower(dc.content) LIKE search_pattern
    )
  ORDER BY rank DESC, dc.created_at DESC
  LIMIT match_count;
END;
$$;
