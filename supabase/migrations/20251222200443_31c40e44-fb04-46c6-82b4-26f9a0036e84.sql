
-- Enable realtime for campaign_videos table
ALTER TABLE campaign_videos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_videos;
