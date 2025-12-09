-- Drop the existing platform check constraint
ALTER TABLE public.campaign_videos DROP CONSTRAINT IF EXISTS campaign_videos_platform_check;

-- Add new constraint that includes youtube
ALTER TABLE public.campaign_videos ADD CONSTRAINT campaign_videos_platform_check 
CHECK (platform IN ('instagram', 'tiktok', 'youtube'));