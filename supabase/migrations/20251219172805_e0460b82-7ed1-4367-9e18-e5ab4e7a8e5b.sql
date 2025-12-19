-- Create YouTube accounts table
CREATE TABLE public.youtube_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id TEXT,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  banner_url TEXT,
  description TEXT,
  subscribers_count INTEGER DEFAULT 0,
  videos_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  profile_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TikTok accounts table
CREATE TABLE public.tiktok_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  likes_count BIGINT DEFAULT 0,
  videos_count INTEGER DEFAULT 0,
  profile_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube videos table
CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.youtube_accounts(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  views_count BIGINT DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  duration INTEGER,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TikTok videos table
CREATE TABLE public.tiktok_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  video_id TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  views_count BIGINT DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  music_title TEXT,
  duration INTEGER,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metrics history tables
CREATE TABLE public.youtube_metrics_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.youtube_accounts(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  subscribers_count INTEGER,
  views_count BIGINT,
  likes_count INTEGER,
  comments_count INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.tiktok_metrics_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  followers_count INTEGER,
  likes_count BIGINT,
  views_count BIGINT,
  comments_count INTEGER,
  shares_count INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.youtube_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_metrics_history ENABLE ROW LEVEL SECURITY;

-- YouTube accounts policies
CREATE POLICY "Users can view their own YouTube accounts" ON public.youtube_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own YouTube accounts" ON public.youtube_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own YouTube accounts" ON public.youtube_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own YouTube accounts" ON public.youtube_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all YouTube accounts" ON public.youtube_accounts FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- TikTok accounts policies
CREATE POLICY "Users can view their own TikTok accounts" ON public.tiktok_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own TikTok accounts" ON public.tiktok_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own TikTok accounts" ON public.tiktok_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own TikTok accounts" ON public.tiktok_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all TikTok accounts" ON public.tiktok_accounts FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- YouTube videos policies
CREATE POLICY "Users can view videos from their accounts" ON public.youtube_videos FOR SELECT USING (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_videos.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Users can insert videos for their accounts" ON public.youtube_videos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_videos.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Users can update videos from their accounts" ON public.youtube_videos FOR UPDATE USING (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_videos.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Users can delete videos from their accounts" ON public.youtube_videos FOR DELETE USING (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_videos.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Admins can view all YouTube videos" ON public.youtube_videos FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- TikTok videos policies
CREATE POLICY "Users can view videos from their TikTok accounts" ON public.tiktok_videos FOR SELECT USING (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_videos.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Users can insert videos for their TikTok accounts" ON public.tiktok_videos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_videos.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Users can update videos from their TikTok accounts" ON public.tiktok_videos FOR UPDATE USING (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_videos.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Users can delete videos from their TikTok accounts" ON public.tiktok_videos FOR DELETE USING (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_videos.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Admins can view all TikTok videos" ON public.tiktok_videos FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- Metrics history policies
CREATE POLICY "Users can view their YouTube metrics history" ON public.youtube_metrics_history FOR SELECT USING (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_metrics_history.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Users can insert YouTube metrics for their accounts" ON public.youtube_metrics_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM youtube_accounts WHERE youtube_accounts.id = youtube_metrics_history.account_id AND youtube_accounts.user_id = auth.uid()));
CREATE POLICY "Admins can view all YouTube metrics history" ON public.youtube_metrics_history FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

CREATE POLICY "Users can view their TikTok metrics history" ON public.tiktok_metrics_history FOR SELECT USING (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_metrics_history.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Users can insert TikTok metrics for their accounts" ON public.tiktok_metrics_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tiktok_accounts WHERE tiktok_accounts.id = tiktok_metrics_history.account_id AND tiktok_accounts.user_id = auth.uid()));
CREATE POLICY "Admins can view all TikTok metrics history" ON public.tiktok_metrics_history FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));