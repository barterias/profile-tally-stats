-- Create video_metrics_history table for tracking daily metrics
CREATE TABLE IF NOT EXISTS public.video_metrics_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares BIGINT DEFAULT 0,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(video_id, recorded_at)
);

-- Create competition_prizes table for competition campaigns
CREATE TABLE IF NOT EXISTS public.competition_prizes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    prize_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, position)
);

-- Enable RLS
ALTER TABLE public.video_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_prizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_metrics_history
CREATE POLICY "Video metrics history viewable by everyone" 
ON public.video_metrics_history 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage video metrics history" 
ON public.video_metrics_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for competition_prizes
CREATE POLICY "Competition prizes viewable by everyone" 
ON public.competition_prizes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage competition prizes" 
ON public.competition_prizes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_metrics_history_video_id ON public.video_metrics_history(video_id);
CREATE INDEX IF NOT EXISTS idx_video_metrics_history_recorded_at ON public.video_metrics_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_competition_prizes_campaign_id ON public.competition_prizes(campaign_id);