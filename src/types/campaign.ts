export type CampaignType = 'pay_per_view' | 'fixed' | 'competition_daily' | 'competition_monthly';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  image_url?: string;
  platforms: string[];
  campaign_type: CampaignType;
  payment_rate: number;
  min_views: number;
  max_paid_views: number;
  competition_type?: string;
  prize_pool: number;
  prize_description?: string;
  rules?: string;
  start_date: string;
  end_date: string;
}

export interface CampaignStats {
  campaign_id: string;
  campaign_name: string;
  campaign_type: CampaignType;
  payment_rate: number;
  competition_type?: string;
  prize_pool: number;
  is_active: boolean;
  total_videos: number;
  total_clippers: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
}

export interface RankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_videos: number;
  total_views: number;
  total_likes?: number;
  rank_position: number;
  estimated_earnings?: number;
}

export interface DailyRanking {
  id: string;
  campaign_id: string;
  user_id: string;
  ranking_date: string;
  views_today: number;
  videos_today: number;
  position: number;
}

export interface UserCampaignEarnings {
  user_id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_type: CampaignType;
  payment_rate: number;
  video_count: number;
  total_views: number;
  estimated_earnings: number;
  username: string;
  avatar_url?: string;
}

export const getCampaignTypeLabel = (type: CampaignType): string => {
  switch (type) {
    case 'pay_per_view':
      return 'Pagamento por View';
    case 'fixed':
      return 'Pagamento Fixo';
    case 'competition_daily':
      return 'Competição Diária';
    case 'competition_monthly':
      return 'Competição Mensal';
    default:
      return type;
  }
};

export const getCampaignTypeColor = (type: CampaignType): string => {
  switch (type) {
    case 'pay_per_view':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'fixed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'competition_daily':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'competition_monthly':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
