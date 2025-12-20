-- Add policies for clients to manage Instagram posts from any account
CREATE POLICY "Clients can insert Instagram posts"
ON public.instagram_posts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);

CREATE POLICY "Clients can update Instagram posts"
ON public.instagram_posts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);

CREATE POLICY "Clients can view all Instagram posts"
ON public.instagram_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);

-- Add policies for clients to manage Instagram accounts
CREATE POLICY "Clients can update Instagram accounts"
ON public.instagram_accounts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);

-- Add policies for clients to insert Instagram metrics history
CREATE POLICY "Clients can insert Instagram metrics history"
ON public.instagram_metrics_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);

CREATE POLICY "Clients can view all Instagram metrics history"
ON public.instagram_metrics_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'client'::app_role
  )
);