-- Studio Kit Web - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Studios table (multiple per user - one for each location/brand)
CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  features TEXT,
  target_audience TEXT,
  instagram_handle TEXT,
  tone TEXT,  -- 文章のトーン: friendly, professional, elegant, energetic, calm
  hashtags TEXT,  -- よく使うハッシュタグ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table (Instagram posts)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  topic TEXT NOT NULL,
  caption TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  media_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(studio_id, date)
);

-- AI Generations log (for cost tracking)
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_jpy DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subtitle jobs
CREATE TABLE subtitle_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  language TEXT DEFAULT 'ja',
  srt_content TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- API Usage summary (daily aggregation)
CREATE TABLE api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  model TEXT NOT NULL,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_jpy DECIMAL(10,2) DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  
  UNIQUE(studio_id, date, model)
);

-- Row Level Security (RLS) Policies
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

-- Studios: users can only see their own
CREATE POLICY "Users can view own studios" ON studios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own studios" ON studios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own studios" ON studios
  FOR UPDATE USING (auth.uid() = user_id);

-- Posts: users can access posts from their studios
CREATE POLICY "Users can view own posts" ON posts
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

-- Similar policies for other tables
CREATE POLICY "Users can view own ai_generations" ON ai_generations
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own ai_generations" ON ai_generations
  FOR INSERT WITH CHECK (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own assets" ON assets
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own assets" ON assets
  FOR ALL USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own subtitle_jobs" ON subtitle_jobs
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own subtitle_jobs" ON subtitle_jobs
  FOR ALL USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own api_usage" ON api_usage_daily
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_posts_studio_date ON posts(studio_id, date);
CREATE INDEX idx_ai_generations_studio ON ai_generations(studio_id, created_at);
CREATE INDEX idx_assets_studio ON assets(studio_id, created_at);
CREATE INDEX idx_api_usage_studio_date ON api_usage_daily(studio_id, date);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER studios_updated_at
  BEFORE UPDATE ON studios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
