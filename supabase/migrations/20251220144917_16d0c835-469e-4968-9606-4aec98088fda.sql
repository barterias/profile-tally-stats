-- Create table for profile change requests
CREATE TABLE public.profile_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('email', 'password')),
  new_value TEXT, -- For email changes, stores the new email. For password, admin sets it
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.profile_change_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create requests for themselves
CREATE POLICY "Users can create their own requests"
ON public.profile_change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
ON public.profile_change_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to process email change
CREATE OR REPLACE FUNCTION public.process_profile_change_request(
  p_request_id UUID,
  p_action TEXT,
  p_new_password TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Verify admin permission
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem processar solicitações';
  END IF;

  -- Get request details
  SELECT * INTO v_request FROM profile_change_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada';
  END IF;

  -- Update request status
  UPDATE profile_change_requests
  SET 
    status = p_action,
    processed_by = auth.uid(),
    processed_at = now(),
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Note: Actual email/password changes must be done via edge function with service role
END;
$$;