-- Create storage buckets for avatars and campaign images
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-images', 'campaign-images', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for campaign-images bucket
CREATE POLICY "Campaign images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

CREATE POLICY "Admins can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaign-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campaign-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaign images"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaign-images' AND has_role(auth.uid(), 'admin'));

-- Add image_url column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url text;