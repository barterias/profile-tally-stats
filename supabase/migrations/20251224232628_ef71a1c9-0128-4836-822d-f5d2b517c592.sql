-- Add policy for admins to insert Instagram posts
CREATE POLICY "Admins can insert all Instagram posts" 
ON public.instagram_posts 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))));