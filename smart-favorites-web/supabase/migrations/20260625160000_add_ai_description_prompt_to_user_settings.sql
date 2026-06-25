-- Persist the user's custom system prompt for bookmark AI descriptions.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ai_description_prompt TEXT;
