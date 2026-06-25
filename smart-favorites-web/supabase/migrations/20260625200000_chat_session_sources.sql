-- Normalized session source records for export, analytics, and smaller message JSON.

CREATE TABLE IF NOT EXISTS public.chat_session_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_timestamp TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_index INT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('bookmark', 'star', 'document')),
  payload JSONB NOT NULL,
  similarity REAL NOT NULL DEFAULT 0,
  citation_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, message_timestamp, source_key)
);

CREATE INDEX IF NOT EXISTS chat_session_sources_session_idx
  ON public.chat_session_sources (session_id, source_index);

CREATE INDEX IF NOT EXISTS chat_session_sources_user_idx
  ON public.chat_session_sources (user_id, created_at DESC);

ALTER TABLE public.chat_session_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat session sources"
  ON public.chat_session_sources
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat session sources"
  ON public.chat_session_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat session sources"
  ON public.chat_session_sources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS rag_rerank_enabled BOOLEAN NOT NULL DEFAULT true;
