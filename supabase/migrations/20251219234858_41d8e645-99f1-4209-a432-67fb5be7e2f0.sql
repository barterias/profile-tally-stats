-- Drop the overly permissive policy that allows anyone to read pending users
DROP POLICY IF EXISTS "Anyone can check their pending status" ON pending_users;

-- Create a new secure RPC function to check pending status by email
CREATE OR REPLACE FUNCTION public.check_pending_user_status(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return non-sensitive fields for the matching email
  RETURN QUERY
  SELECT 
    pu.id,
    pu.email,
    pu.username,
    pu.created_at
  FROM pending_users pu
  WHERE pu.email = p_email;
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.check_pending_user_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_pending_user_status(text) TO anon;