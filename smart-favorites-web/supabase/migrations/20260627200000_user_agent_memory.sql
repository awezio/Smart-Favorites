-- Hermes-style bounded agent memory (MEMORY.md + USER.md).

CREATE TABLE IF NOT EXISTS public.user_agent_memory (
  user_id UUID PRIMARY KEY,
  memory_entries TEXT[] NOT NULL DEFAULT '{}'::text[],
  user_profile_entries TEXT[] NOT NULL DEFAULT '{}'::text[],
  pending_entries TEXT[] NOT NULL DEFAULT '{}'::text[],
  memory_char_limit INT NOT NULL DEFAULT 4000,
  profile_char_limit INT NOT NULL DEFAULT 2000,
  write_approval_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_agent_memory_updated_idx
  ON public.user_agent_memory (updated_at DESC);

ALTER TABLE public.user_agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent memory" ON public.user_agent_memory;
CREATE POLICY "Users can view own agent memory"
  ON public.user_agent_memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own agent memory" ON public.user_agent_memory;
CREATE POLICY "Users can insert own agent memory"
  ON public.user_agent_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own agent memory" ON public.user_agent_memory;
CREATE POLICY "Users can update own agent memory"
  ON public.user_agent_memory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own agent memory" ON public.user_agent_memory;
CREATE POLICY "Users can delete own agent memory"
  ON public.user_agent_memory
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_agent_memory_updated_at ON public.user_agent_memory;
CREATE TRIGGER update_user_agent_memory_updated_at
  BEFORE UPDATE ON public.user_agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
