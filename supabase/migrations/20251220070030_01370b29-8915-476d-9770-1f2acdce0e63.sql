-- Adicionar políticas de DELETE para tabelas de histórico de métricas
-- Isso permite que usuários deletem dados relacionados às suas contas

-- Instagram metrics history - users podem deletar métricas de suas contas
CREATE POLICY "Users can delete metrics from their Instagram accounts" 
ON public.instagram_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM instagram_accounts
    WHERE instagram_accounts.id = instagram_metrics_history.account_id 
    AND instagram_accounts.user_id = auth.uid()
  )
);

-- Admins podem deletar qualquer métrica do Instagram
CREATE POLICY "Admins can delete all Instagram metrics history" 
ON public.instagram_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- TikTok metrics history - users podem deletar métricas de suas contas
CREATE POLICY "Users can delete metrics from their TikTok accounts" 
ON public.tiktok_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM tiktok_accounts
    WHERE tiktok_accounts.id = tiktok_metrics_history.account_id 
    AND tiktok_accounts.user_id = auth.uid()
  )
);

-- Admins podem deletar qualquer métrica do TikTok
CREATE POLICY "Admins can delete all TikTok metrics history" 
ON public.tiktok_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- YouTube metrics history - users podem deletar métricas de suas contas
CREATE POLICY "Users can delete metrics from their YouTube accounts" 
ON public.youtube_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM youtube_accounts
    WHERE youtube_accounts.id = youtube_metrics_history.account_id 
    AND youtube_accounts.user_id = auth.uid()
  )
);

-- Admins podem deletar qualquer métrica do YouTube
CREATE POLICY "Admins can delete all YouTube metrics history" 
ON public.youtube_metrics_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);