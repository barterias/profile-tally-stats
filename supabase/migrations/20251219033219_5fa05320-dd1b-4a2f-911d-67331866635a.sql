-- Create table to store monitored Instagram accounts
CREATE TABLE public.instagram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, username)
);

-- Create table to store Instagram posts metrics
CREATE TABLE public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL UNIQUE,
  post_type TEXT DEFAULT 'post',
  thumbnail_url TEXT,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store metrics history for tracking trends
CREATE TABLE public.instagram_metrics_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.instagram_posts(id) ON DELETE CASCADE,
  followers_count INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_metrics_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_accounts
CREATE POLICY "Users can view their own Instagram accounts"
  ON public.instagram_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Instagram accounts"
  ON public.instagram_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram accounts"
  ON public.instagram_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram accounts"
  ON public.instagram_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can see all accounts
CREATE POLICY "Admins can view all Instagram accounts"
  ON public.instagram_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for instagram_posts
CREATE POLICY "Users can view posts from their accounts"
  ON public.instagram_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert posts for their accounts"
  ON public.instagram_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update posts from their accounts"
  ON public.instagram_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete posts from their accounts"
  ON public.instagram_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

-- Admins can see all posts
CREATE POLICY "Admins can view all Instagram posts"
  ON public.instagram_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for instagram_metrics_history
CREATE POLICY "Users can view metrics history from their accounts"
  ON public.instagram_metrics_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their accounts"
  ON public.instagram_metrics_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.instagram_accounts 
      WHERE id = account_id AND user_id = auth.uid()
    )
  );

-- Admins can see all metrics
CREATE POLICY "Admins can view all metrics history"
  ON public.instagram_metrics_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_instagram_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX idx_instagram_posts_account_id ON public.instagram_posts(account_id);
CREATE INDEX idx_instagram_metrics_history_account_id ON public.instagram_metrics_history(account_id);
CREATE INDEX idx_instagram_metrics_history_recorded_at ON public.instagram_metrics_history(recorded_at);

-- Update trigger for updated_at
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_posts_updated_at
  BEFORE UPDATE ON public.instagram_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();