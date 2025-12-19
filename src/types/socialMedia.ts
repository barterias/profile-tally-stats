// Types for Social Media Dashboard

export type SocialPlatform = 
  | 'tiktok' 
  | 'instagram' 
  | 'youtube' 
  | 'twitter' 
  | 'facebook' 
  | 'linkedin';

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  account_name: string;
  account_username: string;
  profile_image_url?: string;
  access_token?: string; // Only used in backend
  refresh_token?: string; // Only used in backend
  is_connected: boolean;
  connected_at: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialMetrics {
  id: string;
  account_id: string;
  platform: SocialPlatform;
  followers: number;
  following?: number;
  total_posts?: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  reach?: number;
  impressions?: number;
  recorded_at: string;
  created_at: string;
}

export interface MetricsSummary {
  total_followers: number;
  total_views_7d: number;
  total_likes_7d: number;
  total_comments_7d: number;
  avg_engagement_rate: number;
  growth_percentage: number;
  accounts_count: number;
}

export interface SocialAccountWithMetrics extends SocialAccount {
  metrics?: SocialMetrics;
}

export interface ConnectAccountRequest {
  platform: SocialPlatform;
  redirect_uri: string;
}

export interface ConnectAccountResponse {
  oauth_url: string;
  state: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  synced_accounts: number;
  last_synced_at: string;
}

export interface DashboardSettings {
  sync_frequency_hours: number;
  notifications_enabled: boolean;
  email_alerts: boolean;
  timezone: string;
}

export interface ChartDataPoint {
  date: string;
  followers: number;
  views: number;
  engagement: number;
}

export interface PlatformStats {
  platform: SocialPlatform;
  followers: number;
  engagement: number;
  views: number;
  percentage: number;
}

// Platform configuration
export const PLATFORM_CONFIG: Record<SocialPlatform, { 
  name: string; 
  color: string; 
  bgColor: string;
  icon: string;
}> = {
  tiktok: {
    name: 'TikTok',
    color: 'hsl(0, 0%, 100%)',
    bgColor: 'hsl(0, 0%, 0%)',
    icon: 'music',
  },
  instagram: {
    name: 'Instagram',
    color: 'hsl(330, 100%, 60%)',
    bgColor: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    icon: 'instagram',
  },
  youtube: {
    name: 'YouTube',
    color: 'hsl(0, 100%, 50%)',
    bgColor: 'hsl(0, 100%, 50%)',
    icon: 'youtube',
  },
  twitter: {
    name: 'X (Twitter)',
    color: 'hsl(0, 0%, 100%)',
    bgColor: 'hsl(0, 0%, 0%)',
    icon: 'twitter',
  },
  facebook: {
    name: 'Facebook',
    color: 'hsl(221, 44%, 41%)',
    bgColor: 'hsl(221, 44%, 41%)',
    icon: 'facebook',
  },
  linkedin: {
    name: 'LinkedIn',
    color: 'hsl(201, 100%, 35%)',
    bgColor: 'hsl(201, 100%, 35%)',
    icon: 'linkedin',
  },
};
