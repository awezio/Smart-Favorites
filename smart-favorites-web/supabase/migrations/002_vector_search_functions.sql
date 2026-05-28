SET search_path = public, extensions;

-- Function to search bookmarks by embedding
CREATE OR REPLACE FUNCTION match_bookmarks(
  query_embedding extensions.vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  url text,
  description text,
  folder_path text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bookmarks.id,
    bookmarks.user_id,
    bookmarks.title,
    bookmarks.url,
    bookmarks.description,
    bookmarks.folder_path,
    1 - (bookmarks.embedding <=> query_embedding) as similarity
  FROM bookmarks
  WHERE bookmarks.embedding IS NOT NULL
    AND 1 - (bookmarks.embedding <=> query_embedding) > match_threshold
  ORDER BY bookmarks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search github stars by embedding
CREATE OR REPLACE FUNCTION match_stars(
  query_embedding extensions.vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
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
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    github_stars.id,
    github_stars.user_id,
    github_stars.owner,
    github_stars.repo,
    github_stars.url,
    github_stars.description,
    github_stars.language,
    github_stars.stars,
    github_stars.forks,
    1 - (github_stars.embedding <=> query_embedding) as similarity
  FROM github_stars
  WHERE github_stars.embedding IS NOT NULL
    AND 1 - (github_stars.embedding <=> query_embedding) > match_threshold
  ORDER BY github_stars.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search across both bookmarks and stars
CREATE OR REPLACE FUNCTION match_all_items(
  query_embedding extensions.vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  url text,
  description text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH combined_results AS (
    SELECT
      bookmarks.id,
      'bookmark'::text as type,
      bookmarks.title,
      bookmarks.url,
      bookmarks.description,
      1 - (bookmarks.embedding <=> query_embedding) as similarity,
      jsonb_build_object(
        'folder_path', bookmarks.folder_path,
        'add_date', bookmarks.add_date
      ) as metadata
    FROM bookmarks
    WHERE bookmarks.embedding IS NOT NULL
      AND 1 - (bookmarks.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    SELECT
      github_stars.id,
      'star'::text as type,
      (github_stars.owner || '/' || github_stars.repo) as title,
      github_stars.url,
      github_stars.description,
      1 - (github_stars.embedding <=> query_embedding) as similarity,
      jsonb_build_object(
        'owner', github_stars.owner,
        'repo', github_stars.repo,
        'language', github_stars.language,
        'stars', github_stars.stars,
        'forks', github_stars.forks
      ) as metadata
    FROM github_stars
    WHERE github_stars.embedding IS NOT NULL
      AND 1 - (github_stars.embedding <=> query_embedding) > match_threshold
  )
  SELECT * FROM combined_results
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
