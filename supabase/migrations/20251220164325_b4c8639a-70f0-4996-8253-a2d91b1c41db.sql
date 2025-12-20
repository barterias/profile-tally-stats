-- Add policy for campaign owners to delete videos from their campaigns
CREATE POLICY "Campaign owners can delete videos from their campaigns"
ON public.campaign_videos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaign_owners
    WHERE campaign_owners.campaign_id = campaign_videos.campaign_id
    AND campaign_owners.user_id = auth.uid()
  )
);