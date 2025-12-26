-- Add total_views column to tiktok_accounts table
ALTER TABLE public.tiktok_accounts 
ADD COLUMN IF NOT EXISTS total_views bigint DEFAULT 0;