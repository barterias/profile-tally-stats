-- Allow anyone to check if their email is in pending_users (for the pending approval page)
CREATE POLICY "Anyone can check their pending status"
ON public.pending_users
FOR SELECT
USING (true);