-- Restrict user-owned knowledge rows to the authenticated owner.
-- Earlier development policies allowed public access and expected server-side
-- filtering. Keep filtering in code, but make the database enforce ownership.

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_stars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Allow all operations on github_stars" ON public.github_stars;

CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON public.bookmarks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own GitHub stars"
  ON public.github_stars
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GitHub stars"
  ON public.github_stars
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GitHub stars"
  ON public.github_stars
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own GitHub stars"
  ON public.github_stars
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
