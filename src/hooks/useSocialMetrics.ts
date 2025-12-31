import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export interface SocialMetricsSummary {
  totalFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalVideos: number;
  engagementRate: number;
  accountsCount: {
    instagram: number;
    tiktok: number;
    youtube: number;
    total: number;
  };
  platformBreakdown: {
    platform: string;
    followers: number;
    views: number;
    likes: number;
    accounts: number;
  }[];
  recentGrowth: {
    date: string;
    views: number;
    followers: number;
  }[];
}

export function useSocialMetrics() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  return useQuery({
    queryKey: ['social-metrics-unified', user?.id, isAdmin],
    queryFn: async (): Promise<SocialMetricsSummary> => {
      // Fetch all accounts - for clippers, include all their accounts regardless of approval status
      const instagramQuery = supabase
        .from('instagram_accounts')
        .select('id, followers_count, posts_count, approval_status')
        .eq('is_active', true);
      
      const tiktokQuery = supabase
        .from('tiktok_accounts')
        .select('id, followers_count, likes_count, videos_count, approval_status')
        .eq('is_active', true);
      
      const youtubeQuery = supabase
        .from('youtube_accounts')
        .select('id, subscribers_count, total_views, videos_count, approval_status')
        .eq('is_active', true);

      // Apply user filter if not admin
      if (!isAdmin && user?.id) {
        instagramQuery.eq('user_id', user.id);
        tiktokQuery.eq('user_id', user.id);
        youtubeQuery.eq('user_id', user.id);
      }

      const [instagramRes, tiktokRes, youtubeRes] = await Promise.all([
        instagramQuery,
        tiktokQuery,
        youtubeQuery,
      ]);

      const instagramAccounts = instagramRes.data || [];
      const tiktokAccounts = tiktokRes.data || [];
      const youtubeAccounts = youtubeRes.data || [];

      // Calculate Instagram totals
      const instagramFollowers = instagramAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
      
      // Calculate TikTok totals
      const tiktokFollowers = tiktokAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
      const tiktokLikes = tiktokAccounts.reduce((sum, acc) => sum + Number(acc.likes_count || 0), 0);
      const tiktokVideos = tiktokAccounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

      // Calculate YouTube totals
      const youtubeSubscribers = youtubeAccounts.reduce((sum, acc) => sum + (acc.subscribers_count || 0), 0);
      const youtubeViews = youtubeAccounts.reduce((sum, acc) => sum + Number(acc.total_views || 0), 0);
      const youtubeVideos = youtubeAccounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

      // Get active account IDs for filtering videos/posts
      const instagramAccountIds = instagramAccounts.map(a => a.id);
      const tiktokAccountIds = tiktokAccounts.map(a => a.id);
      const youtubeAccountIds = youtubeAccounts.map(a => a.id);

      // Fetch video/post metrics for views - only from active accounts
      let instagramPosts: { data: any[] | null } = { data: [] };
      let tiktokVids: { data: any[] | null } = { data: [] };
      let youtubeVids: { data: any[] | null } = { data: [] };

      if (instagramAccountIds.length > 0) {
        instagramPosts = await supabase
          .from('instagram_posts')
          .select('views_count, likes_count, comments_count, account_id')
          .in('account_id', instagramAccountIds);
      }
      
      if (tiktokAccountIds.length > 0) {
        tiktokVids = await supabase
          .from('tiktok_videos')
          .select('views_count, likes_count, comments_count, account_id')
          .in('account_id', tiktokAccountIds);
      }
      
      if (youtubeAccountIds.length > 0) {
        youtubeVids = await supabase
          .from('youtube_videos')
          .select('views_count, likes_count, comments_count, account_id')
          .in('account_id', youtubeAccountIds);
      }

      const igViews = (instagramPosts.data || []).reduce((sum, p) => sum + (p.views_count || 0), 0);
      const igLikes = (instagramPosts.data || []).reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const igComments = (instagramPosts.data || []).reduce((sum, p) => sum + (p.comments_count || 0), 0);

      const ttViews = (tiktokVids.data || []).reduce((sum, p) => sum + Number(p.views_count || 0), 0);
      const ttLikes = (tiktokVids.data || []).reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const ttComments = (tiktokVids.data || []).reduce((sum, p) => sum + (p.comments_count || 0), 0);

      const ytViews = (youtubeVids.data || []).reduce((sum, p) => sum + Number(p.views_count || 0), 0);
      const ytLikes = (youtubeVids.data || []).reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const ytComments = (youtubeVids.data || []).reduce((sum, p) => sum + (p.comments_count || 0), 0);

      const totalFollowers = instagramFollowers + tiktokFollowers + youtubeSubscribers;
      // Use only content views (from videos/posts) to avoid double-counting YouTube channel views
      const totalViews = igViews + ttViews + ytViews;
      const totalLikes = igLikes + ttLikes + tiktokLikes + ytLikes;
      const totalComments = igComments + ttComments + ytComments;
      const totalVideos = (instagramPosts.data?.length || 0) + (tiktokVids.data?.length || 0) + (youtubeVids.data?.length || 0);
      
      // Calculate engagement rate: (likes + comments) / views * 100
      const totalEngagement = totalLikes + totalComments;
      const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

      const platformBreakdown = [
        {
          platform: 'Instagram',
          followers: instagramFollowers,
          views: igViews,
          likes: igLikes,
          accounts: instagramAccounts.length,
        },
        {
          platform: 'TikTok',
          followers: tiktokFollowers,
          views: ttViews,
          likes: tiktokLikes + ttLikes,
          accounts: tiktokAccounts.length,
        },
        {
          platform: 'YouTube',
          followers: youtubeSubscribers,
          views: ytViews, // Only content views, not channel total_views
          likes: ytLikes,
          accounts: youtubeAccounts.length,
        },
      ];

      return {
        totalFollowers,
        totalViews,
        totalLikes,
        totalComments,
        totalVideos,
        engagementRate,
        accountsCount: {
          instagram: instagramAccounts.length,
          tiktok: tiktokAccounts.length,
          youtube: youtubeAccounts.length,
          total: instagramAccounts.length + tiktokAccounts.length + youtubeAccounts.length,
        },
        platformBreakdown,
        recentGrowth: [],
      };
    },
    enabled: !!user?.id || isAdmin,
  });
}

export function usePlatformDistribution() {
  const { data: metrics } = useSocialMetrics();

  return (metrics?.platformBreakdown || [])
    .filter(p => p.views > 0 || p.followers > 0)
    .map(p => ({
      platform: p.platform,
      value: p.views,
    }));
}
