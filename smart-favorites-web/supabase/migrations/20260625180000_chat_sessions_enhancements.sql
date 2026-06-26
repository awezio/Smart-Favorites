-- Chat session enhancements: auto-title status, pin/archive, hardened RLS.

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS title_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS title_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS auto_title_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS title_llm_provider TEXT,
  ADD COLUMN IF NOT EXISTS title_llm_model TEXT;

-- Replace permissive dev policy with owner-scoped access.
DROP POLICY IF EXISTS "Allow all operations on chat_sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own chat sessions"
  ON public.chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_sessions_user_pinned_idx
  ON public.chat_sessions (user_id, is_pinned, updated_at DESC);

CREATE INDEX IF NOT EXISTS chat_sessions_user_archived_idx
  ON public.chat_sessions (user_id, is_archived, updated_at DESC);
