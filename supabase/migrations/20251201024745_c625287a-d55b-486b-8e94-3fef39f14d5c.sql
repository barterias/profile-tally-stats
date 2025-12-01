-- Drop existing function and recreate with prefixed parameter names
DROP FUNCTION IF EXISTS public.update_role(uuid, text);

CREATE OR REPLACE FUNCTION public.update_role(p_user_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se quem chama é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles';
  END IF;

  -- Atualizar ou inserir role
  INSERT INTO user_roles (user_id, role, status)
  VALUES (
    p_user_id, 
    p_new_role::app_role,
    CASE 
      WHEN p_new_role = 'banned' THEN 'banned'
      ELSE 'approved'
    END
  )
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    role = p_new_role::app_role,
    status = CASE 
      WHEN p_new_role = 'banned' THEN 'banned'
      ELSE 'approved'
    END;
END;
$function$;