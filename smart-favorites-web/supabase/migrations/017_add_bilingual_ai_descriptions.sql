ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS description_zh TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.github_stars
  ADD COLUMN IF NOT EXISTS description_zh TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_metadata JSONB DEFAULT '{}'::jsonb;

UPDATE public.bookmarks
SET description_zh = description
WHERE description_zh IS NULL
  AND description IS NOT NULL;

UPDATE public.github_stars
SET description_zh = description
WHERE description_zh IS NULL
  AND description IS NOT NULL;
