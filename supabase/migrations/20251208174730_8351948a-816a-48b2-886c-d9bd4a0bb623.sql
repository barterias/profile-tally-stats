-- Create a function to check campaign ownership without recursion
CREATE OR REPLACE FUNCTION public.is_campaign_owner(_user_id uuid, _campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_owners
    WHERE user_id = _user_id
      AND campaign_id = _campaign_id
  )
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Campaign owners can view campaign ownership" ON public.campaign_owners;

-- Create new non-recursive policy for campaign owners to view their own records
CREATE POLICY "Users can view all campaign ownership for their campaigns"
ON public.campaign_owners
FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin')
);