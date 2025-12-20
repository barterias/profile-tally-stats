-- Add email_reference column for forgot password requests from login page
ALTER TABLE public.profile_change_requests 
ADD COLUMN email_reference TEXT;

-- Create a function to handle forgot password requests without auth
CREATE OR REPLACE FUNCTION public.request_password_reset(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email using auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Check if there's already a pending request
    IF NOT EXISTS (
      SELECT 1 FROM profile_change_requests 
      WHERE user_id = v_user_id 
      AND request_type = 'password' 
      AND status = 'pending'
    ) THEN
      INSERT INTO profile_change_requests (user_id, request_type, email_reference)
      VALUES (v_user_id, 'password', p_email);
    END IF;
  END IF;
  
  -- Always return success for security (don't reveal if email exists)
END;
$$;