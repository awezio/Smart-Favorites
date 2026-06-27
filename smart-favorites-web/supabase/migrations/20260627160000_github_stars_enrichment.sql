-- Phase 1: structured enrichment fields for github_stars

ALTER TABLE public.github_stars
  ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS readme_summary TEXT,
  ADD COLUMN IF NOT EXISTS readme_summary_zh TEXT,
  ADD COLUMN IF NOT EXISTS index_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS starred_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS github_stars_index_status_idx ON public.github_stars (user_id, index_status);
