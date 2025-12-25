-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to profile avatars
CREATE POLICY "Public can view profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Allow service role to manage profile avatars (for edge functions)
CREATE POLICY "Service role can manage profile avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'profile-avatars')
WITH CHECK (bucket_id = 'profile-avatars');