-- Create creators_metrics table to store consolidated metrics from scraper
CREATE TABLE public.creators_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  followers_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per platform/username/period
  CONSTRAINT unique_creator_period UNIQUE (platform, username, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.creators_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all creators metrics"
ON public.creators_metrics
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view all creators metrics"
ON public.creators_metrics
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'client'::app_role
));

CREATE POLICY "Authenticated users can view creators metrics"
ON public.creators_metrics
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_creators_metrics_platform ON public.creators_metrics(platform);
CREATE INDEX idx_creators_metrics_scraped_at ON public.creators_metrics(scraped_at DESC);
CREATE INDEX idx_creators_metrics_username ON public.creators_metrics(username);

-- Create trigger for updated_at
CREATE TRIGGER update_creators_metrics_updated_at
BEFORE UPDATE ON public.creators_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();