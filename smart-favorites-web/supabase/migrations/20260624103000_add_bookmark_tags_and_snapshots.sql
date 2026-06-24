ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS snapshot_url TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS snapshot_error TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_snapshot_status_check;

ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_snapshot_status_check
  CHECK (snapshot_status IN ('pending', 'capturing', 'ready', 'failed', 'unavailable'));

UPDATE public.bookmarks
SET tags = regexp_split_to_array(trim(both '/' from folder_path), '/')
WHERE (tags IS NULL OR cardinality(tags) = 0)
  AND folder_path IS NOT NULL
  AND trim(both '/' from folder_path) <> '';

CREATE INDEX IF NOT EXISTS bookmarks_tags_idx
  ON public.bookmarks USING gin(tags);

CREATE INDEX IF NOT EXISTS bookmarks_snapshot_status_idx
  ON public.bookmarks(snapshot_status);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bookmark_snapshots',
  'bookmark_snapshots',
  false,
  5242880,
  ARRAY['image/png']
)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own bookmark snapshots'
  ) THEN
    CREATE POLICY "Users can read own bookmark snapshots"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'bookmark_snapshots'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own bookmark snapshots'
  ) THEN
    CREATE POLICY "Users can upload own bookmark snapshots"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'bookmark_snapshots'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can replace own bookmark snapshots'
  ) THEN
    CREATE POLICY "Users can replace own bookmark snapshots"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'bookmark_snapshots'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      )
      WITH CHECK (
        bucket_id = 'bookmark_snapshots'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;
END $$;
