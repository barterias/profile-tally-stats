
-- Create kwai_accounts table (mirrors tiktok_accounts structure)
CREATE TABLE IF NOT EXISTS public.kwai_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text NOT NULL,
  profile_url text NOT NULL,
  display_name text DEFAULT NULL,
  bio text DEFAULT NULL,
  profile_image_url text DEFAULT NULL,
  followers_count integer DEFAULT NULL,
  following_count integer DEFAULT NULL,
  likes_count bigint DEFAULT NULL,
  videos_count integer DEFAULT NULL,
  scraped_videos_count integer DEFAULT NULL,
  total_views bigint DEFAULT NULL,
  next_cursor text DEFAULT NULL,
  is_active boolean DEFAULT true,
  approval_status text DEFAULT 'pending',
  approved_at timestamp with time zone DEFAULT NULL,
  approved_by uuid DEFAULT NULL,
  last_synced_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create kwai_videos table (mirrors tiktok_videos structure)
CREATE TABLE IF NOT EXISTS public.kwai_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.kwai_accounts(id) ON DELETE CASCADE,
  video_id text DEFAULT NULL,
  video_url text NOT NULL,
  caption text DEFAULT NULL,
  thumbnail_url text DEFAULT NULL,
  views_count bigint DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  duration integer DEFAULT NULL,
  music_title text DEFAULT NULL,
  posted_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create kwai_metrics_history table (mirrors tiktok_metrics_history)
CREATE TABLE IF NOT EXISTS public.kwai_metrics_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.kwai_accounts(id) ON DELETE CASCADE,
  video_id uuid DEFAULT NULL REFERENCES public.kwai_videos(id) ON DELETE SET NULL,
  followers_count integer DEFAULT NULL,
  likes_count bigint DEFAULT NULL,
  comments_count integer DEFAULT NULL,
  shares_count integer DEFAULT NULL,
  views_count bigint DEFAULT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.kwai_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwai_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwai_metrics_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kwai_accounts
CREATE POLICY "Users can view their own kwai accounts"
  ON public.kwai_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kwai accounts"
  ON public.kwai_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kwai accounts"
  ON public.kwai_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own kwai accounts"
  ON public.kwai_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all kwai accounts"
  ON public.kwai_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view all kwai accounts"
  ON public.kwai_accounts FOR SELECT
  USING (has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "Clients can update all kwai accounts"
  ON public.kwai_accounts FOR UPDATE
  USING (has_role(auth.uid(), 'client'::app_role));

-- RLS Policies for kwai_videos
CREATE POLICY "Users can view videos from their kwai accounts"
  ON public.kwai_videos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_videos.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Users can insert videos for their kwai accounts"
  ON public.kwai_videos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_videos.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Users can update videos from their kwai accounts"
  ON public.kwai_videos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_videos.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Users can delete videos from their kwai accounts"
  ON public.kwai_videos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_videos.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Admins can manage all kwai videos"
  ON public.kwai_videos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

CREATE POLICY "Clients can view all kwai videos"
  ON public.kwai_videos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'client'::app_role));

CREATE POLICY "Clients can insert kwai videos for any account"
  ON public.kwai_videos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'client'::app_role));

CREATE POLICY "Clients can update kwai videos for any account"
  ON public.kwai_videos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'client'::app_role));

-- RLS Policies for kwai_metrics_history
CREATE POLICY "Users can view metrics from their kwai accounts"
  ON public.kwai_metrics_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_metrics_history.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Users can insert metrics for their kwai accounts"
  ON public.kwai_metrics_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_metrics_history.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Users can delete metrics from their kwai accounts"
  ON public.kwai_metrics_history FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.kwai_accounts WHERE kwai_accounts.id = kwai_metrics_history.account_id AND kwai_accounts.user_id = auth.uid()));

CREATE POLICY "Admins can manage all kwai metrics history"
  ON public.kwai_metrics_history FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

CREATE POLICY "Clients can view all kwai metrics history"
  ON public.kwai_metrics_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'client'::app_role));

CREATE POLICY "Clients can insert kwai metrics history"
  ON public.kwai_metrics_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'client'::app_role));

-- Update updated_at trigger for kwai_accounts
CREATE TRIGGER update_kwai_accounts_updated_at
  BEFORE UPDATE ON public.kwai_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kwai_videos_updated_at
  BEFORE UPDATE ON public.kwai_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update delete_social_account to support kwai
CREATE OR REPLACE FUNCTION public.delete_social_account(p_account_id uuid, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify permission: must be admin OR owner of the account
  IF NOT has_role(auth.uid(), 'admin') THEN
    IF p_platform = 'instagram' THEN
      IF NOT EXISTS (SELECT 1 FROM instagram_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    ELSIF p_platform = 'youtube' THEN
      IF NOT EXISTS (SELECT 1 FROM youtube_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    ELSIF p_platform = 'tiktok' THEN
      IF NOT EXISTS (SELECT 1 FROM tiktok_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    ELSIF p_platform = 'kwai' THEN
      IF NOT EXISTS (SELECT 1 FROM kwai_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    END IF;
  END IF;

  IF p_platform = 'instagram' THEN
    DELETE FROM instagram_metrics_history WHERE account_id = p_account_id;
    DELETE FROM instagram_posts WHERE account_id = p_account_id;
    DELETE FROM instagram_accounts WHERE id = p_account_id;
  ELSIF p_platform = 'youtube' THEN
    DELETE FROM youtube_metrics_history WHERE account_id = p_account_id;
    DELETE FROM youtube_videos WHERE account_id = p_account_id;
    DELETE FROM youtube_accounts WHERE id = p_account_id;
  ELSIF p_platform = 'tiktok' THEN
    DELETE FROM tiktok_metrics_history WHERE account_id = p_account_id;
    DELETE FROM tiktok_videos WHERE account_id = p_account_id;
    DELETE FROM tiktok_accounts WHERE id = p_account_id;
  ELSIF p_platform = 'kwai' THEN
    DELETE FROM kwai_metrics_history WHERE account_id = p_account_id;
    DELETE FROM kwai_videos WHERE account_id = p_account_id;
    DELETE FROM kwai_accounts WHERE id = p_account_id;
  ELSE
    RAISE EXCEPTION 'Plataforma inválida: %', p_platform;
  END IF;
END;
$function$;

-- Update approve_social_account to support kwai
CREATE OR REPLACE FUNCTION public.approve_social_account(p_account_id uuid, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'client') THEN
    RAISE EXCEPTION 'Sem permissão para aprovar contas';
  END IF;
  
  IF p_platform = 'instagram' THEN
    UPDATE instagram_accounts SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'tiktok' THEN
    UPDATE tiktok_accounts SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'youtube' THEN
    UPDATE youtube_accounts SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'kwai' THEN
    UPDATE kwai_accounts SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  END IF;
END;
$function$;

-- Update reject_social_account to support kwai
CREATE OR REPLACE FUNCTION public.reject_social_account(p_account_id uuid, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'client') THEN
    RAISE EXCEPTION 'Sem permissão para rejeitar contas';
  END IF;
  
  IF p_platform = 'instagram' THEN
    UPDATE instagram_accounts SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'tiktok' THEN
    UPDATE tiktok_accounts SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'youtube' THEN
    UPDATE youtube_accounts SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  ELSIF p_platform = 'kwai' THEN
    UPDATE kwai_accounts SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid() WHERE id = p_account_id;
  END IF;
END;
$function$;
