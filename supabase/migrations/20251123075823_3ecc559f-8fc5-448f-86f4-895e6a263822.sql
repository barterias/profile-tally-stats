-- Allow public signups by permitting anyone to insert into pending_users
-- This is necessary for new user registration
CREATE POLICY "Anyone can register as pending user"
ON public.pending_users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);