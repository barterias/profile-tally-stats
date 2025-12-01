-- Add campaign type and payment configuration
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT 'pay_per_view';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payment_rate numeric DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_views integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_paid_views integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS competition_type text DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prize_pool numeric DEFAULT 0;

-- Create daily ranking table for competition campaigns
CREATE TABLE IF NOT EXISTS daily_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ranking_date date NOT NULL DEFAULT CURRENT_DATE,
  views_today bigint DEFAULT 0,
  videos_today integer DEFAULT 0,
  position integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, user_id, ranking_date)
);

-- Create monthly ranking table
CREATE TABLE IF NOT EXISTS monthly_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ranking_month date NOT NULL,
  total_views bigint DEFAULT 0,
  total_videos integer DEFAULT 0,
  position integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, user_id, ranking_month)
);

-- Enable RLS
ALTER TABLE daily_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_rankings
CREATE POLICY "Daily rankings are viewable by everyone" ON daily_rankings FOR SELECT USING (true);
CREATE POLICY "Admins can manage daily rankings" ON daily_rankings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for monthly_rankings
CREATE POLICY "Monthly rankings are viewable by everyone" ON monthly_rankings FOR SELECT USING (true);
CREATE POLICY "Admins can manage monthly rankings" ON monthly_rankings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create view for comprehensive campaign stats
CREATE OR REPLACE VIEW campaign_stats_view AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.campaign_type,
  c.payment_rate,
  c.competition_type,
  c.prize_pool,
  c.is_active,
  COUNT(DISTINCT cv.id) as total_videos,
  COUNT(DISTINCT cv.submitted_by) as total_clippers,
  COALESCE(SUM(cv.views), 0) as total_views,
  COALESCE(SUM(cv.likes), 0) as total_likes,
  COALESCE(SUM(cv.comments), 0) as total_comments,
  COALESCE(SUM(cv.shares), 0) as total_shares
FROM campaigns c
LEFT JOIN campaign_videos cv ON cv.campaign_id = c.id
GROUP BY c.id, c.name, c.campaign_type, c.payment_rate, c.competition_type, c.prize_pool, c.is_active;

-- Create view for user earnings per campaign
CREATE OR REPLACE VIEW user_campaign_earnings AS
SELECT 
  cv.submitted_by as user_id,
  cv.campaign_id,
  c.name as campaign_name,
  c.campaign_type,
  c.payment_rate,
  COUNT(cv.id) as video_count,
  COALESCE(SUM(cv.views), 0) as total_views,
  CASE 
    WHEN c.campaign_type = 'pay_per_view' THEN 
      ROUND((COALESCE(SUM(cv.views), 0) / 1000.0) * c.payment_rate, 2)
    ELSE 0
  END as estimated_earnings,
  p.username,
  p.avatar_url
FROM campaign_videos cv
JOIN campaigns c ON c.id = cv.campaign_id
LEFT JOIN profiles p ON p.id = cv.submitted_by
WHERE cv.submitted_by IS NOT NULL
GROUP BY cv.submitted_by, cv.campaign_id, c.name, c.campaign_type, c.payment_rate, p.username, p.avatar_url;