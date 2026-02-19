-- ================================================================
-- Keyword search functions for hybrid search
-- Supports ILIKE matching on title, url, description, folder_path
-- ================================================================

-- Keyword search bookmarks
CREATE OR REPLACE FUNCTION keyword_search_bookmarks(
  query_text text,
  filter_user_id uuid DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  url text,
  description text,
  folder_path text,
  add_date timestamptz,
  icon text,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_pattern text := '%' || lower(query_text) || '%';
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    b.title,
    b.url,
    b.description,
    b.folder_path,
    b.add_date,
    b.icon,
    b.created_at,
    b.updated_at,
    CASE
      WHEN lower(b.title) = lower(query_text) THEN 1.0
      WHEN lower(b.title) LIKE search_pattern THEN 0.8
      WHEN lower(b.url) LIKE search_pattern THEN 0.7
      WHEN b.description IS NOT NULL AND lower(b.description) LIKE search_pattern THEN 0.5
      WHEN b.folder_path IS NOT NULL AND lower(b.folder_path) LIKE search_pattern THEN 0.3
      ELSE 0.1
    END::real AS rank
  FROM bookmarks b
  WHERE
    (filter_user_id IS NULL OR b.user_id = filter_user_id)
    AND (
      lower(b.title) LIKE search_pattern
      OR lower(b.url) LIKE search_pattern
      OR (b.description IS NOT NULL AND lower(b.description) LIKE search_pattern)
      OR (b.folder_path IS NOT NULL AND lower(b.folder_path) LIKE search_pattern)
    )
  ORDER BY rank DESC, b.created_at DESC
  LIMIT match_count;
END;
$$;

-- Keyword search github stars
CREATE OR REPLACE FUNCTION keyword_search_stars(
  query_text text,
  filter_user_id uuid DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner text,
  repo text,
  url text,
  description text,
  language text,
  stars int,
  forks int,
  updated timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_pattern text := '%' || lower(query_text) || '%';
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.owner,
    s.repo,
    s.url,
    s.description,
    s.language,
    s.stars,
    s.forks,
    s.updated,
    s.created_at,
    s.updated_at,
    CASE
      WHEN lower(s.repo) = lower(query_text) THEN 1.0
      WHEN lower(s.owner || '/' || s.repo) LIKE search_pattern THEN 0.9
      WHEN lower(s.repo) LIKE search_pattern THEN 0.8
      WHEN lower(s.url) LIKE search_pattern THEN 0.7
      WHEN s.description IS NOT NULL AND lower(s.description) LIKE search_pattern THEN 0.5
      WHEN s.language IS NOT NULL AND lower(s.language) LIKE search_pattern THEN 0.3
      ELSE 0.1
    END::real AS rank
  FROM github_stars s
  WHERE
    (filter_user_id IS NULL OR s.user_id = filter_user_id)
    AND (
      lower(s.owner) LIKE search_pattern
      OR lower(s.repo) LIKE search_pattern
      OR lower(s.url) LIKE search_pattern
      OR (s.description IS NOT NULL AND lower(s.description) LIKE search_pattern)
      OR (s.language IS NOT NULL AND lower(s.language) LIKE search_pattern)
    )
  ORDER BY rank DESC, s.stars DESC
  LIMIT match_count;
END;
$$;
