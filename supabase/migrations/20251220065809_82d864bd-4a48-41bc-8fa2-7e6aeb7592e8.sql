-- Adicionar políticas para permitir que clients vejam todas as contas de redes sociais
-- Isso é necessário para que clients possam aprovar/rejeitar contas de clippers

-- Instagram accounts - clients podem ver todas as contas
CREATE POLICY "Clients can view all Instagram accounts" 
ON public.instagram_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'client'
  )
);

-- TikTok accounts - clients podem ver todas as contas
CREATE POLICY "Clients can view all TikTok accounts" 
ON public.tiktok_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'client'
  )
);

-- YouTube accounts - clients podem ver todas as contas
CREATE POLICY "Clients can view all YouTube accounts" 
ON public.youtube_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'client'
  )
);