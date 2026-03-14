-- Migration: Add tone and hashtags columns to studios table
-- Run this if you already have the studios table

ALTER TABLE studios ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS hashtags TEXT;

COMMENT ON COLUMN studios.tone IS '文章のトーン: friendly, professional, elegant, energetic, calm';
COMMENT ON COLUMN studios.hashtags IS 'よく使うハッシュタグ（自動追加用）';
