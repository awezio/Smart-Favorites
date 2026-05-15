-- Phase 3: Square storage bucket and media metadata hardening

INSERT INTO storage.buckets (id, name, public)
VALUES ('square_media', 'square_media', true)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can read square media'
  ) THEN
    CREATE POLICY "Anyone can read square media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'square_media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload square media'
  ) THEN
    CREATE POLICY "Authenticated users can upload square media"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'square_media'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own square media'
  ) THEN
    CREATE POLICY "Users can delete own square media"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'square_media'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

ALTER TABLE square_post_media
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

UPDATE square_post_media
SET storage_path = COALESCE(storage_path, '')
WHERE storage_path IS NULL;

CREATE INDEX IF NOT EXISTS square_post_media_storage_path_idx
  ON square_post_media(storage_path);
