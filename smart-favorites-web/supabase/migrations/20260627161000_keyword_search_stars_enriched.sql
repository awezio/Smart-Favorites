-- Extend tokenized keyword search for enriched github_stars fields.

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
  terms text[] := tokenize_search_query(query_text);
  normalized_query text := lower(trim(coalesce(query_text, '')));
BEGIN
  IF array_length(terms, 1) IS NULL THEN
    RETURN;
  END IF;

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
    GREATEST(
      CASE WHEN lower(s.repo) = normalized_query THEN 1.0 ELSE 0.0 END,
      CASE WHEN lower(s.owner || '/' || s.repo) LIKE '%' || normalized_query || '%' THEN 0.9 ELSE 0.0 END,
      COALESCE((
        SELECT MAX(
          CASE
            WHEN lower(s.repo) LIKE '%' || term || '%' THEN 0.85
            WHEN lower(s.owner) LIKE '%' || term || '%' THEN 0.75
            WHEN lower(s.url) LIKE '%' || term || '%' THEN 0.7
            WHEN s.description IS NOT NULL AND lower(s.description) LIKE '%' || term || '%' THEN 0.55
            WHEN s.description_zh IS NOT NULL AND lower(s.description_zh) LIKE '%' || term || '%' THEN 0.62
            WHEN s.description_en IS NOT NULL AND lower(s.description_en) LIKE '%' || term || '%' THEN 0.6
            WHEN s.readme_summary IS NOT NULL AND lower(s.readme_summary) LIKE '%' || term || '%' THEN 0.58
            WHEN s.readme_summary_zh IS NOT NULL AND lower(s.readme_summary_zh) LIKE '%' || term || '%' THEN 0.6
            WHEN s.language IS NOT NULL AND lower(s.language) LIKE '%' || term || '%' THEN 0.35
            WHEN s.topics IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(s.topics) AS topic WHERE lower(topic) LIKE '%' || term || '%'
            ) THEN 0.65
            WHEN s.tags IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(s.tags) AS tag WHERE lower(tag) LIKE '%' || term || '%'
            ) THEN 0.68
            ELSE 0.0
          END
        )
        FROM unnest(terms) AS term
      ), 0.0)
    )::real AS rank
  FROM github_stars s
  WHERE
    (filter_user_id IS NULL OR s.user_id = filter_user_id)
    AND EXISTS (
      SELECT 1
      FROM unnest(terms) AS term
      WHERE
        lower(s.owner) LIKE '%' || term || '%'
        OR lower(s.repo) LIKE '%' || term || '%'
        OR lower(s.url) LIKE '%' || term || '%'
        OR (s.description IS NOT NULL AND lower(s.description) LIKE '%' || term || '%')
        OR (s.description_zh IS NOT NULL AND lower(s.description_zh) LIKE '%' || term || '%')
        OR (s.description_en IS NOT NULL AND lower(s.description_en) LIKE '%' || term || '%')
        OR (s.readme_summary IS NOT NULL AND lower(s.readme_summary) LIKE '%' || term || '%')
        OR (s.readme_summary_zh IS NOT NULL AND lower(s.readme_summary_zh) LIKE '%' || term || '%')
        OR (s.language IS NOT NULL AND lower(s.language) LIKE '%' || term || '%')
        OR (
          s.topics IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(s.topics) AS topic WHERE lower(topic) LIKE '%' || term || '%'
          )
        )
        OR (
          s.tags IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(s.tags) AS tag WHERE lower(tag) LIKE '%' || term || '%'
          )
        )
    )
  ORDER BY rank DESC, s.stars DESC
  LIMIT match_count;
END;
$$;
