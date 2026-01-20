
-- Adicionar políticas para admins poderem UPDATE em todas as contas

-- Instagram: Admins can update all Instagram accounts
CREATE POLICY "Admins can update all Instagram accounts"
ON public.instagram_accounts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- TikTok: Admins can update all TikTok accounts
CREATE POLICY "Admins can update all TikTok accounts"
ON public.tiktok_accounts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- YouTube: Admins can update all YouTube accounts
CREATE POLICY "Admins can update all YouTube accounts"
ON public.youtube_accounts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Clients can update all TikTok accounts
CREATE POLICY "Clients can update all TikTok accounts"
ON public.tiktok_accounts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- Clients can update all YouTube accounts
CREATE POLICY "Clients can update all YouTube accounts"
ON public.youtube_accounts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- Adicionar políticas para admins inserir posts/videos em qualquer conta

-- Instagram Posts: Admins can insert posts for any account
CREATE POLICY "Admins can insert posts for any account"
ON public.instagram_posts
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Instagram Posts: Admins can update posts for any account
CREATE POLICY "Admins can update posts for any account"
ON public.instagram_posts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Clients can insert posts for any account
CREATE POLICY "Clients can insert posts for any account"
ON public.instagram_posts
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- Clients can update posts for any account
CREATE POLICY "Clients can update posts for any account"
ON public.instagram_posts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- TikTok Videos: Clients can insert videos for any account
CREATE POLICY "Clients can insert TikTok videos for any account"
ON public.tiktok_videos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- TikTok Videos: Clients can update videos for any account
CREATE POLICY "Clients can update TikTok videos for any account"
ON public.tiktok_videos
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- YouTube Videos: Clients can insert videos for any account
CREATE POLICY "Clients can insert YouTube videos for any account"
ON public.youtube_videos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- YouTube Videos: Clients can update YouTube videos for any account
CREATE POLICY "Clients can update YouTube videos for any account"
ON public.youtube_videos
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- Metrics History: Admins and Clients can insert metrics for any account

-- TikTok Metrics History: Clients can insert
CREATE POLICY "Clients can insert TikTok metrics history"
ON public.tiktok_metrics_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- TikTok Metrics History: Clients can view all
CREATE POLICY "Clients can view all TikTok metrics history"
ON public.tiktok_metrics_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));

-- YouTube Metrics History: Clients can insert
CREATE POLICY "Clients can insert YouTube metrics history"
ON public.youtube_metrics_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'client'::app_role
));
