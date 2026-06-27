-- Tokenized keyword search: split queries into terms instead of whole-string ILIKE.

CREATE OR REPLACE FUNCTION tokenize_search_query(query_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text := lower(trim(coalesce(query_text, '')));
  tokens text[] := '{}';
  latin_match text[];
  cjk_match text[];
  stop_words text[] := ARRAY[
    'the', 'and', 'for', 'with', 'from', 'find', 'search', 'my', 'about',
    '帮我', '寻找', '搜索', '查找', '查询', '检索', '一下', '里面', '里面找',
    '热门', '项目', '相关', '最好', '能否', '可以', '什么', '哪些', '怎么',
    '在我', '帮我在', '里面找', '找一下', '一下爬'
  ];
  token text;
  bigram text;
  index int;
BEGIN
  IF normalized = '' THEN
    RETURN '{}';
  END IF;

  FOR latin_match IN
    SELECT regexp_matches(normalized, '[a-z0-9][a-z0-9.+#-]*', 'g')
  LOOP
    token := latin_match[1];
    IF length(token) >= 2 AND NOT (token = ANY (stop_words)) THEN
      tokens := array_append(tokens, token);
    END IF;
  END LOOP;

  FOR cjk_match IN
    SELECT regexp_matches(normalized, '[一-龥]{2,}', 'g')
  LOOP
    token := cjk_match[1];
    IF NOT (token = ANY (stop_words)) THEN
      tokens := array_append(tokens, token);
    END IF;

    IF length(token) > 2 THEN
      FOR index IN 1..(length(token) - 1) LOOP
        bigram := substring(token from index for 2);
        IF length(bigram) >= 2 AND NOT (bigram = ANY (stop_words)) THEN
          tokens := array_append(tokens, bigram);
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN (
    SELECT coalesce(array_agg(DISTINCT entry), '{}')
    FROM unnest(tokens) AS entry
    WHERE entry IS NOT NULL AND length(entry) >= 2
  );
END;
$$;

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
  terms text[] := tokenize_search_query(query_text);
  normalized_query text := lower(trim(coalesce(query_text, '')));
BEGIN
  IF array_length(terms, 1) IS NULL THEN
  RETURN;
  END IF;

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
    GREATEST(
      CASE WHEN lower(b.title) = normalized_query THEN 1.0 ELSE 0.0 END,
      CASE WHEN lower(b.title) LIKE '%' || normalized_query || '%' THEN 0.85 ELSE 0.0 END,
      CASE WHEN lower(b.url) LIKE '%' || normalized_query || '%' THEN 0.75 ELSE 0.0 END,
      COALESCE((
        SELECT MAX(
          CASE
            WHEN lower(b.title) LIKE '%' || term || '%' THEN 0.8
            WHEN lower(b.url) LIKE '%' || term || '%' THEN 0.7
            WHEN b.description IS NOT NULL AND lower(b.description) LIKE '%' || term || '%' THEN 0.55
            WHEN b.description_zh IS NOT NULL AND lower(b.description_zh) LIKE '%' || term || '%' THEN 0.6
            WHEN b.description_en IS NOT NULL AND lower(b.description_en) LIKE '%' || term || '%' THEN 0.58
            WHEN b.folder_path IS NOT NULL AND lower(b.folder_path) LIKE '%' || term || '%' THEN 0.35
            ELSE 0.0
          END
        )
        FROM unnest(terms) AS term
      ), 0.0)
    )::real AS rank
  FROM bookmarks b
  WHERE
    (filter_user_id IS NULL OR b.user_id = filter_user_id)
    AND EXISTS (
      SELECT 1
      FROM unnest(terms) AS term
      WHERE
        lower(b.title) LIKE '%' || term || '%'
        OR lower(b.url) LIKE '%' || term || '%'
        OR (b.description IS NOT NULL AND lower(b.description) LIKE '%' || term || '%')
        OR (b.description_zh IS NOT NULL AND lower(b.description_zh) LIKE '%' || term || '%')
        OR (b.description_en IS NOT NULL AND lower(b.description_en) LIKE '%' || term || '%')
        OR (b.folder_path IS NOT NULL AND lower(b.folder_path) LIKE '%' || term || '%')
    )
  ORDER BY rank DESC, b.created_at DESC
  LIMIT match_count;
END;
$$;

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
            WHEN s.language IS NOT NULL AND lower(s.language) LIKE '%' || term || '%' THEN 0.35
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
        OR (s.language IS NOT NULL AND lower(s.language) LIKE '%' || term || '%')
    )
  ORDER BY rank DESC, s.stars DESC
  LIMIT match_count;
END;
$$;
