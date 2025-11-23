-- Criar tabela para usuários pendentes de aprovação
CREATE TABLE IF NOT EXISTS public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campo de advertência na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS warning TEXT DEFAULT 'none' CHECK (warning IN ('none', 'warning', 'suspension'));

-- Adicionar campo de status no user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'banned'));

-- Criar view para admin
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.id,
  p.email,
  p.username,
  'pending' as status,
  'user'::app_role as role,
  'none' as warning,
  p.created_at as date
FROM pending_users p
UNION ALL
SELECT 
  prof.id,
  au.email,
  prof.username,
  COALESCE(ur.status, 'approved') as status,
  COALESCE(ur.role, 'user'::app_role) as role,
  COALESCE(prof.warning, 'none') as warning,
  prof.created_at as date
FROM profiles prof
JOIN auth.users au ON au.id = prof.id
LEFT JOIN user_roles ur ON ur.user_id = prof.id;

-- RPC: Aprovar usuário pendente
CREATE OR REPLACE FUNCTION public.approve_user(pending_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_username TEXT;
  v_password TEXT;
  v_user_id UUID;
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar usuários';
  END IF;

  -- Pegar dados do pendente
  SELECT email, username, password_hash 
  INTO v_email, v_username, v_password
  FROM pending_users 
  WHERE id = pending_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário pendente não encontrado';
  END IF;

  -- Criar usuário no auth (simulado - na prática o Supabase cria via signup)
  -- Por enquanto, apenas remove da tabela pendente
  DELETE FROM pending_users WHERE id = pending_id;
  
END;
$$;

-- RPC: Rejeitar usuário pendente
CREATE OR REPLACE FUNCTION public.reject_user(pending_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar usuários';
  END IF;

  DELETE FROM pending_users WHERE id = pending_id;
END;
$$;

-- RPC: Atualizar role do usuário
CREATE OR REPLACE FUNCTION public.update_role(user_id UUID, new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles';
  END IF;

  -- Atualizar ou inserir role
  INSERT INTO user_roles (user_id, role, status)
  VALUES (
    user_id, 
    new_role::app_role,
    CASE 
      WHEN new_role = 'banned' THEN 'banned'
      ELSE 'approved'
    END
  )
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    role = new_role::app_role,
    status = CASE 
      WHEN new_role = 'banned' THEN 'banned'
      ELSE 'approved'
    END;
END;
$$;

-- RPC: Atualizar advertência do usuário
CREATE OR REPLACE FUNCTION public.update_warning(user_id UUID, new_warning TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar advertências';
  END IF;

  UPDATE profiles 
  SET warning = new_warning
  WHERE id = user_id;
END;
$$;

-- Habilitar RLS
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Policy para admin ver usuários pendentes
CREATE POLICY "Admins podem ver usuários pendentes"
ON public.pending_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy para admin gerenciar usuários pendentes
CREATE POLICY "Admins podem gerenciar usuários pendentes"
ON public.pending_users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));