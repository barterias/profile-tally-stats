-- Enable REPLICA IDENTITY FULL for video/post tables for complete realtime data
ALTER TABLE public.tiktok_videos REPLICA IDENTITY FULL;
ALTER TABLE public.instagram_posts REPLICA IDENTITY FULL;
ALTER TABLE public.youtube_videos REPLICA IDENTITY FULL;