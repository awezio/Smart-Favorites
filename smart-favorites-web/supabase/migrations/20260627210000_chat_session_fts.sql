-- Full-text search over chat session messages (on-demand, no memory quota).

CREATE OR REPLACE FUNCTION public.chat_session_messages_to_text(msgs JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    string_agg(
      trim(both FROM COALESCE(elem->>'content', '')),
      ' '
      ORDER BY ordinality
    ),
    ''
  )
  FROM jsonb_array_elements(COALESCE(msgs, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ordinality)
  WHERE COALESCE(elem->>'role', '') IN ('user', 'assistant');
$$;

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS messages_fts tsvector;

CREATE OR REPLACE FUNCTION public.chat_sessions_refresh_messages_fts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.messages_fts := to_tsvector('simple', public.chat_session_messages_to_text(NEW.messages));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_sessions_messages_fts_trigger ON public.chat_sessions;
CREATE TRIGGER chat_sessions_messages_fts_trigger
  BEFORE INSERT OR UPDATE OF messages ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_sessions_refresh_messages_fts();

UPDATE public.chat_sessions
SET messages_fts = to_tsvector('simple', public.chat_session_messages_to_text(messages))
WHERE messages IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_sessions_messages_fts_idx
  ON public.chat_sessions USING gin (messages_fts);

CREATE OR REPLACE FUNCTION public.session_search(
  query_text TEXT,
  filter_user_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  session_id UUID,
  title TEXT,
  snippet TEXT,
  rank REAL,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  query_ts := plainto_tsquery('simple', COALESCE(query_text, ''));
  IF query_text IS NULL OR length(trim(query_text)) = 0 OR query_ts IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cs.id AS session_id,
    cs.title,
    left(public.chat_session_messages_to_text(cs.messages), 240) AS snippet,
    ts_rank(cs.messages_fts, query_ts)::real AS rank,
    cs.updated_at
  FROM public.chat_sessions cs
  WHERE cs.user_id = filter_user_id
    AND cs.messages_fts @@ query_ts
  ORDER BY rank DESC, cs.updated_at DESC
  LIMIT GREATEST(1, LEAST(match_count, 50));
END;
$$;
