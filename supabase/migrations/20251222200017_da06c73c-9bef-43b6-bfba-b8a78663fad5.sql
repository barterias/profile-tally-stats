
-- Drop existing INSERT policy that restricts admins
DROP POLICY IF EXISTS "Authenticated users can submit videos" ON campaign_videos;

-- Create new INSERT policy that allows admins to insert any videos
CREATE POLICY "Admins can insert any campaign video"
ON campaign_videos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy for regular users to submit their own videos
CREATE POLICY "Users can submit their own videos"
ON campaign_videos
FOR INSERT
WITH CHECK (
  auth.uid() = submitted_by
);

-- Add UPDATE policy for admins to update any video
DROP POLICY IF EXISTS "Admins can update campaign videos" ON campaign_videos;
CREATE POLICY "Admins can update any campaign video"
ON campaign_videos
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
