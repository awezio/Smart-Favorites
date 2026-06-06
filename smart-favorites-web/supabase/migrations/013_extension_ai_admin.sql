-- Extension bridge sessions and AI admin telemetry.

CREATE TABLE IF NOT EXISTS public.extension_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extension_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS extension_sessions_user_id_idx
  ON public.extension_sessions(user_id);

CREATE INDEX IF NOT EXISTS extension_sessions_active_token_idx
  ON public.extension_sessions(token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.extension_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extension sessions"
  ON public.extension_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke own extension sessions"
  ON public.extension_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  latency_ms INTEGER,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_call_logs_created_at_idx
  ON public.ai_call_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS ai_call_logs_provider_idx
  ON public.ai_call_logs(provider, created_at DESC);

ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI call logs"
  ON public.ai_call_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.github_stars
  DROP CONSTRAINT IF EXISTS github_stars_url_key;

ALTER TABLE public.github_stars
  ADD CONSTRAINT github_stars_user_id_url_key UNIQUE (user_id, url);
