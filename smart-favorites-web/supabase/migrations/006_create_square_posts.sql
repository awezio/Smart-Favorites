-- Square feature: Steam-style posts, media, and votes

-- Posts table
CREATE TABLE IF NOT EXISTS square_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  target_type TEXT CHECK (target_type IN ('bookmark', 'star', 'general')),
  target_id UUID,
  target_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media attachments for posts
CREATE TABLE IF NOT EXISTS square_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES square_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes (Steam-style helpful/not helpful)
CREATE TABLE IF NOT EXISTS square_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES square_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS square_posts_user_id_idx ON square_posts(user_id);
CREATE INDEX IF NOT EXISTS square_posts_created_at_idx ON square_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS square_posts_target_type_idx ON square_posts(target_type);
CREATE INDEX IF NOT EXISTS square_post_media_post_id_idx ON square_post_media(post_id);
CREATE INDEX IF NOT EXISTS square_post_votes_post_id_idx ON square_post_votes(post_id);

-- RLS
ALTER TABLE square_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_post_votes ENABLE ROW LEVEL SECURITY;

-- square_posts policies
CREATE POLICY "Anyone can view posts" ON square_posts FOR SELECT USING (true);
CREATE POLICY "Auth users can create posts" ON square_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON square_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON square_posts FOR DELETE USING (auth.uid() = user_id);

-- square_post_media policies
CREATE POLICY "Anyone can view media" ON square_post_media FOR SELECT USING (true);
CREATE POLICY "Auth users can add media" ON square_post_media FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM square_posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own media" ON square_post_media FOR DELETE USING (
  EXISTS (SELECT 1 FROM square_posts WHERE id = post_id AND user_id = auth.uid())
);

-- square_post_votes policies
CREATE POLICY "Anyone can view votes" ON square_post_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON square_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vote" ON square_post_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own vote" ON square_post_votes FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger for posts
CREATE TRIGGER update_square_posts_updated_at
  BEFORE UPDATE ON square_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
