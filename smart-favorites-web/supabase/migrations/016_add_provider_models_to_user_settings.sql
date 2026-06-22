-- Persist latest fetched model lists per AI provider.
-- Shape: { "openai": { "models": [{ "id": "...", "label": "..." }], "fetchedAt": "..." } }

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS provider_models JSONB DEFAULT '{}'::jsonb;
