-- Fix update_role function to properly handle banning users
-- The issue was ON CONFLICT creating duplicates instead of updating existing roles
DROP FUNCTION IF EXISTS public.update_role(uuid, text);

CREATE OR REPLACE FUNCTION public.update_role(p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin permission
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;

  -- Delete existing roles for this user (except if banning)
  DELETE FROM user_roles WHERE user_id = p_user_id;

  -- Insert the new role
  INSERT INTO user_roles (user_id, role, status)
  VALUES (
    p_user_id, 
    p_new_role::app_role,
    CASE 
      WHEN p_new_role = 'admin' THEN 'approved'
      WHEN p_new_role = 'client' THEN 'approved'
      ELSE 'approved'
    END
  );
  
  -- If banning, also update status to banned
  IF p_new_role = 'user' THEN
    -- This is a demotion to regular user, keep status as approved
    NULL;
  END IF;
END;
$function$;

-- Create a separate function for banning users
CREATE OR REPLACE FUNCTION public.ban_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin permission
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can ban users';
  END IF;

  -- Update all roles to have banned status
  UPDATE user_roles 
  SET status = 'banned'
  WHERE user_id = p_user_id;
  
  -- If no roles exist, create one with banned status
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role, status)
    VALUES (p_user_id, 'user', 'banned');
  END IF;
END;
$function$;

-- Enable realtime for social accounts tables so admin dashboard updates automatically
ALTER TABLE public.instagram_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.tiktok_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.youtube_accounts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tiktok_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_accounts;