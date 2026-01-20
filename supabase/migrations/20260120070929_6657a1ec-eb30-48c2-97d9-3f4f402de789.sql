
-- Criar tabela para relacionamento muitos-para-muitos entre usuários e contas sociais
CREATE TABLE public.social_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_owner BOOLEAN DEFAULT false, -- true = quem adicionou originalmente
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, account_id, user_id)
);

-- Enable RLS
ALTER TABLE public.social_account_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own links"
ON public.social_account_links FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all links"
ON public.social_account_links FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view all links"
ON public.social_account_links FOR SELECT
USING (has_role(auth.uid(), 'client'));

CREATE POLICY "Users can create their own links"
ON public.social_account_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all links"
ON public.social_account_links FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Função para linkar conta a todos os admins automaticamente
CREATE OR REPLACE FUNCTION public.link_account_to_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
  v_platform TEXT;
BEGIN
  -- Determinar a plataforma baseado na tabela
  IF TG_TABLE_NAME = 'instagram_accounts' THEN
    v_platform := 'instagram';
  ELSIF TG_TABLE_NAME = 'tiktok_accounts' THEN
    v_platform := 'tiktok';
  ELSIF TG_TABLE_NAME = 'youtube_accounts' THEN
    v_platform := 'youtube';
  END IF;

  -- Inserir link para o owner original
  INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
  VALUES (v_platform, NEW.id, NEW.user_id, true)
  ON CONFLICT (platform, account_id, user_id) DO NOTHING;

  -- Linkar automaticamente a todos os admins
  FOR admin_user IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    IF admin_user.user_id != NEW.user_id THEN
      INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
      VALUES (v_platform, NEW.id, admin_user.user_id, false)
      ON CONFLICT (platform, account_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Triggers para linkar automaticamente quando conta é criada
CREATE TRIGGER link_instagram_account_to_admins
AFTER INSERT ON public.instagram_accounts
FOR EACH ROW EXECUTE FUNCTION public.link_account_to_admins();

CREATE TRIGGER link_tiktok_account_to_admins
AFTER INSERT ON public.tiktok_accounts
FOR EACH ROW EXECUTE FUNCTION public.link_account_to_admins();

CREATE TRIGGER link_youtube_account_to_admins
AFTER INSERT ON public.youtube_accounts
FOR EACH ROW EXECUTE FUNCTION public.link_account_to_admins();

-- Migrar contas existentes: linkar todas as contas existentes aos admins
INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'instagram', id, user_id, true FROM instagram_accounts
WHERE is_active = true OR is_active IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'tiktok', id, user_id, true FROM tiktok_accounts
WHERE is_active = true OR is_active IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'youtube', id, user_id, true FROM youtube_accounts
WHERE is_active = true OR is_active IS NULL
ON CONFLICT DO NOTHING;

-- Linkar contas existentes aos admins
INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'instagram', ia.id, ur.user_id, false
FROM instagram_accounts ia
CROSS JOIN user_roles ur
WHERE ur.role = 'admin' 
  AND ia.user_id != ur.user_id
  AND (ia.is_active = true OR ia.is_active IS NULL)
ON CONFLICT DO NOTHING;

INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'tiktok', ta.id, ur.user_id, false
FROM tiktok_accounts ta
CROSS JOIN user_roles ur
WHERE ur.role = 'admin' 
  AND ta.user_id != ur.user_id
  AND (ta.is_active = true OR ta.is_active IS NULL)
ON CONFLICT DO NOTHING;

INSERT INTO social_account_links (platform, account_id, user_id, is_owner)
SELECT 'youtube', ya.id, ur.user_id, false
FROM youtube_accounts ya
CROSS JOIN user_roles ur
WHERE ur.role = 'admin' 
  AND ya.user_id != ur.user_id
  AND (ya.is_active = true OR ya.is_active IS NULL)
ON CONFLICT DO NOTHING;
