-- Adicionar coluna de status de aprovação nas tabelas de contas de redes sociais
ALTER TABLE public.instagram_accounts 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.tiktok_accounts 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.youtube_accounts 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Adicionar colunas para rastrear quem aprovou
ALTER TABLE public.instagram_accounts 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.tiktok_accounts 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.youtube_accounts 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Aprovar automaticamente contas existentes
UPDATE public.instagram_accounts SET approval_status = 'approved' WHERE approval_status = 'pending';
UPDATE public.tiktok_accounts SET approval_status = 'approved' WHERE approval_status = 'pending';
UPDATE public.youtube_accounts SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Criar função para aprovar conta de rede social
CREATE OR REPLACE FUNCTION public.approve_social_account(p_account_id uuid, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin ou client
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'client') THEN
    RAISE EXCEPTION 'Sem permissão para aprovar contas';
  END IF;
  
  IF p_platform = 'instagram' THEN
    UPDATE instagram_accounts 
    SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  ELSIF p_platform = 'tiktok' THEN
    UPDATE tiktok_accounts 
    SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  ELSIF p_platform = 'youtube' THEN
    UPDATE youtube_accounts 
    SET approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  END IF;
END;
$$;

-- Criar função para rejeitar conta de rede social
CREATE OR REPLACE FUNCTION public.reject_social_account(p_account_id uuid, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin ou client
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'client') THEN
    RAISE EXCEPTION 'Sem permissão para rejeitar contas';
  END IF;
  
  IF p_platform = 'instagram' THEN
    UPDATE instagram_accounts 
    SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  ELSIF p_platform = 'tiktok' THEN
    UPDATE tiktok_accounts 
    SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  ELSIF p_platform = 'youtube' THEN
    UPDATE youtube_accounts 
    SET approval_status = 'rejected', approved_at = now(), approved_by = auth.uid()
    WHERE id = p_account_id;
  END IF;
END;
$$;

-- Criar view para contas pendentes de aprovação
CREATE OR REPLACE VIEW public.pending_social_accounts AS
SELECT 
  'instagram' as platform,
  ia.id,
  ia.username,
  ia.display_name,
  ia.profile_image_url,
  ia.followers_count,
  ia.posts_count as content_count,
  ia.user_id,
  ia.approval_status,
  ia.created_at,
  p.username as owner_username
FROM instagram_accounts ia
LEFT JOIN profiles p ON p.id = ia.user_id
WHERE ia.approval_status = 'pending'
UNION ALL
SELECT 
  'tiktok' as platform,
  ta.id,
  ta.username,
  ta.display_name,
  ta.profile_image_url,
  ta.followers_count,
  ta.videos_count as content_count,
  ta.user_id,
  ta.approval_status,
  ta.created_at,
  p.username as owner_username
FROM tiktok_accounts ta
LEFT JOIN profiles p ON p.id = ta.user_id
WHERE ta.approval_status = 'pending'
UNION ALL
SELECT 
  'youtube' as platform,
  ya.id,
  ya.username,
  ya.display_name,
  ya.profile_image_url,
  ya.subscribers_count as followers_count,
  ya.videos_count as content_count,
  ya.user_id,
  ya.approval_status,
  ya.created_at,
  p.username as owner_username
FROM youtube_accounts ya
LEFT JOIN profiles p ON p.id = ya.user_id
WHERE ya.approval_status = 'pending';