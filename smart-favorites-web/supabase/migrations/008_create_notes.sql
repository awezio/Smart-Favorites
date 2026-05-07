-- Knowledge notes table for manual text entries
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vector search for notes
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  content text,
  tags text[],
  source_url text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.content,
    n.tags,
    n.source_url,
    n.created_at,
    n.updated_at,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM notes n
  WHERE n.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR n.user_id = filter_user_id)
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keyword search for notes
CREATE OR REPLACE FUNCTION keyword_search_notes(
  query_text text,
  filter_user_id uuid DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  content text,
  tags text[],
  source_url text,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_pattern text := '%' || lower(query_text) || '%';
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.content,
    n.tags,
    n.source_url,
    n.created_at,
    n.updated_at,
    CASE
      WHEN lower(n.title) = lower(query_text) THEN 1.0
      WHEN lower(n.title) LIKE search_pattern THEN 0.8
      WHEN lower(n.content) LIKE search_pattern THEN 0.6
      WHEN n.source_url IS NOT NULL AND lower(n.source_url) LIKE search_pattern THEN 0.4
      ELSE 0.1
    END::real AS rank
  FROM notes n
  WHERE
    (filter_user_id IS NULL OR n.user_id = filter_user_id)
    AND (
      lower(n.title) LIKE search_pattern
      OR lower(n.content) LIKE search_pattern
      OR (n.source_url IS NOT NULL AND lower(n.source_url) LIKE search_pattern)
    )
  ORDER BY rank DESC, n.created_at DESC
  LIMIT match_count;
END;
$$;
