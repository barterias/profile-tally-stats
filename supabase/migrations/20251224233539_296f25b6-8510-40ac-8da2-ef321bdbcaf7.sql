
-- Add missing RLS policies for admins and clients to view all videos/posts

-- Clients can view all TikTok videos
CREATE POLICY "Clients can view all TikTok videos" 
ON public.tiktok_videos 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'client'::app_role))));

-- Clients can view all YouTube videos
CREATE POLICY "Clients can view all YouTube videos" 
ON public.youtube_videos 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'client'::app_role))));

-- Admins can insert all TikTok videos
CREATE POLICY "Admins can insert all TikTok videos" 
ON public.tiktok_videos 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can update all TikTok videos
CREATE POLICY "Admins can update all TikTok videos" 
ON public.tiktok_videos 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can insert all YouTube videos
CREATE POLICY "Admins can insert all YouTube videos" 
ON public.youtube_videos 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can update all YouTube videos
CREATE POLICY "Admins can update all YouTube videos" 
ON public.youtube_videos 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can insert all Instagram metrics history
CREATE POLICY "Admins can insert Instagram metrics history" 
ON public.instagram_metrics_history 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can insert TikTok metrics history
CREATE POLICY "Admins can insert TikTok metrics history" 
ON public.tiktok_metrics_history 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Admins can insert YouTube metrics history
CREATE POLICY "Admins can insert YouTube metrics history" 
ON public.youtube_metrics_history 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));

-- Clients can view TikTok metrics history
CREATE POLICY "Clients can view TikTok metrics history" 
ON public.tiktok_metrics_history 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'client'::app_role))));

-- Clients can view YouTube metrics history
CREATE POLICY "Clients can view YouTube metrics history" 
ON public.youtube_metrics_history 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'client'::app_role))));
