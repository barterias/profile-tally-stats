-- Allow campaign owners to update their own campaigns
CREATE POLICY "Campaign owners can update their campaigns"
ON public.campaigns
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaign_owners
    WHERE campaign_owners.campaign_id = campaigns.id
    AND campaign_owners.user_id = auth.uid()
  )
);

-- Allow campaign owners to manage competition prizes for their campaigns
CREATE POLICY "Campaign owners can manage their campaign prizes"
ON public.competition_prizes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaign_owners
    WHERE campaign_owners.campaign_id = competition_prizes.campaign_id
    AND campaign_owners.user_id = auth.uid()
  )
);

-- Allow campaign owners to view all campaign owners for their campaigns
CREATE POLICY "Campaign owners can view campaign ownership"
ON public.campaign_owners
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_owners co
    WHERE co.campaign_id = campaign_owners.campaign_id
    AND co.user_id = auth.uid()
  )
);