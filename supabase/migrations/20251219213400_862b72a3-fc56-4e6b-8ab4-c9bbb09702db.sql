-- Drop the existing ban_user function
DROP FUNCTION IF EXISTS public.ban_user(uuid);

-- Create a new function that completely deletes the user from the database
CREATE OR REPLACE FUNCTION public.ban_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin permission
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can ban users';
  END IF;

  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- Delete user profile
  DELETE FROM profiles WHERE id = p_user_id;
  
  -- Delete user from auth.users (this will cascade delete related data)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;