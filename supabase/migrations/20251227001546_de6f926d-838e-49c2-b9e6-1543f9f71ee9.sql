-- Add scraped content count columns to track how many videos/posts were actually scraped
-- This allows showing "X de Y" (collected/total) in the UI

-- TikTok: add scraped_videos_count
ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS scraped_videos_count INTEGER DEFAULT 0;

-- Instagram: add total_views (sum from posts) and scraped_posts_count
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS total_views BIGINT DEFAULT 0;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS scraped_posts_count INTEGER DEFAULT 0;

-- YouTube: add scraped_videos_count
ALTER TABLE youtube_accounts ADD COLUMN IF NOT EXISTS scraped_videos_count INTEGER DEFAULT 0;