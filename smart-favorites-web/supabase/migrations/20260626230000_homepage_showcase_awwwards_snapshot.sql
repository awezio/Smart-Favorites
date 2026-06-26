-- Use the existing bookmark PNG snapshot for Awwwards instead of bundled SVG previews.

UPDATE public.homepage_showcase_items
SET
  title = 'Awwwards',
  url = 'https://www.awwwards.com/',
  image_url = '__bookmark_snapshot__',
  category = 'AI网站设计模板',
  bookmark_id = '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid,
  bookmark_url_match = 'smart-favorites.cc.cd,best website,bestwebsite,awwwards',
  enabled = true
WHERE bookmark_url_match ILIKE '%awwwards%'
   OR bookmark_url_match ILIKE '%smart-favorites%'
   OR bookmark_id = '97a89baf-44d4-4f74-9a78-6e677311e943'::uuid
   OR url = 'https://www.awwwards.com/';
