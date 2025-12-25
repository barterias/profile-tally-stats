-- Enable Realtime for instagram_posts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_posts;

-- Enable Realtime for tiktok_videos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tiktok_videos;

-- Enable Realtime for youtube_videos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_videos;

-- Set REPLICA IDENTITY FULL for complete row data on updates
ALTER TABLE public.instagram_posts REPLICA IDENTITY FULL;
ALTER TABLE public.tiktok_videos REPLICA IDENTITY FULL;
ALTER TABLE public.youtube_videos REPLICA IDENTITY FULL;