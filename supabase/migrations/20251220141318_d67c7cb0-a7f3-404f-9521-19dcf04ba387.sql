-- Add DELETE policies for admins on social accounts tables (only missing ones)

-- Instagram accounts - Admin delete policy
CREATE POLICY "Admins can delete all Instagram accounts" 
ON public.instagram_accounts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- YouTube accounts - Admin delete policy
CREATE POLICY "Admins can delete all YouTube accounts" 
ON public.youtube_accounts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- TikTok accounts - Admin delete policy
CREATE POLICY "Admins can delete all TikTok accounts" 
ON public.tiktok_accounts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Instagram posts - Admin delete policy
CREATE POLICY "Admins can delete all Instagram posts" 
ON public.instagram_posts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- YouTube videos - Admin delete policy
CREATE POLICY "Admins can delete all YouTube videos" 
ON public.youtube_videos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- TikTok videos - Admin delete policy
CREATE POLICY "Admins can delete all TikTok videos" 
ON public.tiktok_videos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));