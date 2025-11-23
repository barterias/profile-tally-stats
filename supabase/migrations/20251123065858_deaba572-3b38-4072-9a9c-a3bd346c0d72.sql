-- Remover view insegura
DROP VIEW IF EXISTS public.admin_users_view;

-- Criar função segura para buscar dados de usuários admin
CREATE OR REPLACE FUNCTION public.get_admin_users_view()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  status TEXT,
  role app_role,
  warning TEXT,
  date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  -- Usuários pendentes
  SELECT 
    p.id,
    p.email,
    p.username,
    'pending'::TEXT as status,
    'user'::app_role as role,
    'none'::TEXT as warning,
    p.created_at as date
  FROM pending_users p
  UNION ALL
  -- Usuários ativos
  SELECT 
    prof.id,
    (SELECT email FROM auth.users WHERE id = prof.id) as email,
    prof.username,
    COALESCE(ur.status, 'approved')::TEXT as status,
    COALESCE(ur.role, 'user'::app_role) as role,
    COALESCE(prof.warning, 'none')::TEXT as warning,
    prof.created_at as date
  FROM profiles prof
  LEFT JOIN user_roles ur ON ur.user_id = prof.id
  ORDER BY date DESC;
END;
$$;