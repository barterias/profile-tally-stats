-- Create social_videos table for TikTok and Instagram videos
CREATE TABLE IF NOT EXISTS public.social_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  title text NOT NULL,
  thumbnail text,
  views bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments integer DEFAULT 0,
  shares bigint DEFAULT 0,
  duration integer,
  creator_avatar text,
  music_title text,
  video_url text NOT NULL,
  link text NOT NULL UNIQUE,
  inserted_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (videos are viewable by everyone)
CREATE POLICY "Videos are viewable by everyone" 
ON public.social_videos 
FOR SELECT 
USING (true);

-- Create policies for authenticated users to insert videos
CREATE POLICY "Authenticated users can insert videos" 
ON public.social_videos 
FOR INSERT 
WITH CHECK (true);

-- Create policies for authenticated users to update videos
CREATE POLICY "Authenticated users can update videos" 
ON public.social_videos 
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_social_videos_platform ON public.social_videos(platform);
CREATE INDEX idx_social_videos_views ON public.social_videos(views DESC);
CREATE INDEX idx_social_videos_inserted_at ON public.social_videos(inserted_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_videos_updated_at
BEFORE UPDATE ON public.social_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();