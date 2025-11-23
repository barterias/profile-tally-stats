-- Corrigir função com ambiguidade no campo email
DROP FUNCTION IF EXISTS public.get_admin_users_view();

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
    pu.id,
    pu.email,
    pu.username,
    'pending'::TEXT as status,
    'user'::app_role as role,
    'none'::TEXT as warning,
    pu.created_at as date
  FROM pending_users pu
  UNION ALL
  -- Usuários ativos
  SELECT 
    prof.id,
    au.email,
    prof.username,
    COALESCE(ur.status, 'approved')::TEXT as status,
    COALESCE(ur.role, 'user'::app_role) as role,
    COALESCE(prof.warning, 'none')::TEXT as warning,
    prof.created_at as date
  FROM profiles prof
  JOIN auth.users au ON au.id = prof.id
  LEFT JOIN user_roles ur ON ur.user_id = prof.id
  ORDER BY date DESC;
END;
$$;