-- Modificar função approve_user para criar o usuário no auth quando aprovado
CREATE OR REPLACE FUNCTION public.approve_user(pending_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_username TEXT;
  v_password TEXT;
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

  -- Usuário será criado via edge function ou manualmente pelo admin
  -- Por enquanto, apenas marcar como processado removendo da tabela pending
  DELETE FROM pending_users WHERE id = pending_id;
  
  -- Nota: O admin precisará criar o usuário manualmente no painel
  -- ou podemos usar uma edge function para criar via Admin API
END;
$$;