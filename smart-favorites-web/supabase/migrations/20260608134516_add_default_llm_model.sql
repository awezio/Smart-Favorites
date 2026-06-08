ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_llm_model TEXT;
