-- Admin-managed homepage showcase carousel items.

CREATE TABLE IF NOT EXISTS public.homepage_showcase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  bookmark_id UUID REFERENCES public.bookmarks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS homepage_showcase_items_sort_idx
  ON public.homepage_showcase_items (enabled, sort_order ASC, created_at ASC);

ALTER TABLE public.homepage_showcase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view enabled homepage showcase items" ON public.homepage_showcase_items;
CREATE POLICY "Public can view enabled homepage showcase items"
  ON public.homepage_showcase_items
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

CREATE OR REPLACE FUNCTION public.touch_homepage_showcase_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS homepage_showcase_items_updated_at ON public.homepage_showcase_items;
CREATE TRIGGER homepage_showcase_items_updated_at
  BEFORE UPDATE ON public.homepage_showcase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_homepage_showcase_items_updated_at();

INSERT INTO public.homepage_showcase_items (title, url, image_url, category, sort_order, enabled)
SELECT
  'Smart Favorites',
  'https://www.smart-favorites.cc.cd/',
  '/images/editorial/hero-paper.jpg',
  'Product',
  0,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.homepage_showcase_items
  WHERE url = 'https://www.smart-favorites.cc.cd/'
);
