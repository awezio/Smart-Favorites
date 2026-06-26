-- Pin Awwwards showcase card to a known-good bookmark snapshot URL.

UPDATE public.homepage_showcase_items
SET
  title = 'Awwwards',
  url = 'https://www.awwwards.com/',
  image_url = '/api/showcase/snapshot?id=97a89baf-44d4-4f74-9a78-6e677311e943&v=2026-06-25T17%3A56%3A53.524%2B00%3A00',
  category = 'AI网站设计模板',
  bookmark_id = '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid,
  bookmark_url_match = 'ai网页设计模板,best website,bestwebsite,awwwards,smart-favorites',
  enabled = true
WHERE bookmark_url_match ILIKE '%awwwards%'
   OR bookmark_url_match ILIKE '%smart-favorites%'
   OR bookmark_url_match ILIKE '%best website%'
   OR bookmark_id = '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid
   OR url = 'https://www.awwwards.com/';

INSERT INTO public.homepage_showcase_items (
  title,
  url,
  image_url,
  category,
  bookmark_id,
  bookmark_url_match,
  sort_order,
  enabled
)
SELECT
  'Awwwards',
  'https://www.awwwards.com/',
  '/api/showcase/snapshot?id=97a89baf-44d4-4f74-9a78-6e677311e943&v=2026-06-25T17%3A56%3A53.524%2B00%3A00',
  'AI网站设计模板',
  '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid,
  'ai网页设计模板,best website,bestwebsite,awwwards,smart-favorites',
  0,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.homepage_showcase_items
  WHERE bookmark_id = '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid
     OR bookmark_url_match ILIKE '%awwwards%'
     OR bookmark_url_match ILIKE '%best website%'
);
