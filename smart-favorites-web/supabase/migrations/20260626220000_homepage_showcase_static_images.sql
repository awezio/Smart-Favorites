-- Point showcase overrides at bundled preview images and broaden bookmark matching.

UPDATE public.homepage_showcase_items
SET
  title = 'Awwwards',
  url = 'https://www.awwwards.com/',
  image_url = '/images/showcase/awwwards.svg',
  category = 'AI网站设计模板',
  bookmark_url_match = 'smart-favorites.cc.cd,best website,bestwebsite,awwwards',
  enabled = true
WHERE bookmark_url_match = 'smart-favorites.cc.cd'
   OR url = 'https://www.awwwards.com/';

UPDATE public.homepage_showcase_items
SET
  title = 'Website Design Inspiration | Httpster',
  url = 'https://httpster.net/',
  image_url = '/images/showcase/httpster.svg',
  category = 'AI网页设计',
  bookmark_url_match = 'chatexcel,httpster,chat excel',
  enabled = true
WHERE bookmark_url_match = 'chatexcel'
   OR url = 'https://httpster.net/';

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
  WHERE bookmark_url_match ILIKE '%awwwards%'
     OR bookmark_url_match ILIKE '%best website%'
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
  WHERE bookmark_url_match ILIKE '%chatexcel%'
     OR bookmark_url_match ILIKE '%httpster%'
);
