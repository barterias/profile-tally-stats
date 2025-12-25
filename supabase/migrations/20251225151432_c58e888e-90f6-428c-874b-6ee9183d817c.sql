-- Create unified profile_metrics table for realtime updates
CREATE TABLE public.profile_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(platform, username)
);

-- Enable RLS
ALTER TABLE public.profile_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view profile metrics"
ON public.profile_metrics FOR SELECT TO authenticated USING (true);

-- Allow service role to manage (for edge functions)
CREATE POLICY "Service role can manage profile metrics"
ON public.profile_metrics FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_profile_metrics_platform ON public.profile_metrics(platform);
CREATE INDEX idx_profile_metrics_username ON public.profile_metrics(platform, username);
CREATE INDEX idx_profile_metrics_updated ON public.profile_metrics(updated_at DESC);

-- Enable Realtime for this table
ALTER TABLE public.profile_metrics REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_metrics;