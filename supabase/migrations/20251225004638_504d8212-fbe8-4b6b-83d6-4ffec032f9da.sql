-- Use REPLICA IDENTITY FULL for complete row data on social media accounts
ALTER TABLE public.instagram_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.youtube_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.tiktok_accounts REPLICA IDENTITY FULL;