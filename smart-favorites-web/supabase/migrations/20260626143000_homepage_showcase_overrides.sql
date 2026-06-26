-- Showcase overrides: patch specific bookmark cards without replacing the full gallery.

ALTER TABLE public.homepage_showcase_items
  ADD COLUMN IF NOT EXISTS bookmark_url_match TEXT;

-- Stop replacing the whole gallery with a standalone Smart Favorites card.
UPDATE public.homepage_showcase_items
SET enabled = false
WHERE url = 'https://www.smart-favorites.cc.cd/'
  AND bookmark_id IS NULL
  AND bookmark_url_match IS NULL;

INSERT INTO public.homepage_showcase_items (
  title,
  url,
  image_url,
  category,
  bookmark_url_match,
  sort_order,
  enabled
)
SELECT
  'Awwwards',
  'https://www.awwwards.com/',
  '/images/showcase/awwwards.svg',
  'AI网站设计模板',
  'smart-favorites.cc.cd,best website,bestwebsite,awwwards',
  0,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.homepage_showcase_items
  WHERE bookmark_url_match = 'smart-favorites.cc.cd'
);

INSERT INTO public.homepage_showcase_items (
  title,
  url,
  image_url,
  category,
  bookmark_url_match,
  sort_order,
  enabled
)
SELECT
  'Website Design Inspiration | Httpster',
  'https://httpster.net/',
  '/images/showcase/httpster.svg',
  'AI网页设计',
  'chatexcel,httpster,chat excel',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.homepage_showcase_items
  WHERE bookmark_url_match = 'chatexcel'
);
