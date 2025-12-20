import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientMetricsSummary {
  totalFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalClippers: number;
  totalCampaigns: number;
  platformBreakdown: {
    platform: string;
    followers: number;
    views: number;
    likes: number;
    accounts: number;
  }[];
  topClippers: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    totalViews: number;
    platform: string;
  }[];
}

export function useClientMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-metrics', user?.id],
    queryFn: async (): Promise<ClientMetricsSummary> => {
      if (!user?.id) {
        return getEmptyMetrics();
      }

      // 1. Get campaigns owned by this client
      const { data: ownedCampaigns } = await supabase
        .from('campaign_owners')
        .select('campaign_id')
        .eq('user_id', user.id);

      const campaignIds = (ownedCampaigns || []).map(c => c.campaign_id);

      if (campaignIds.length === 0) {
        return getEmptyMetrics();
      }

      // 2. Get approved participants from these campaigns
      const { data: participants } = await supabase
        .from('campaign_participants')
        .select('user_id')
        .in('campaign_id', campaignIds)
        .eq('status', 'approved');

      const clipperIds = [...new Set((participants || []).map(p => p.user_id))];

      if (clipperIds.length === 0) {
        return getEmptyMetrics();
      }

      // 3. Get clipper profiles for usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', clipperIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // 4. Get social media accounts from these clippers
      const [instagramAccs, tiktokAccs, youtubeAccs] = await Promise.all([
        supabase.from('instagram_accounts').select('id, user_id, followers_count').in('user_id', clipperIds).eq('is_active', true).eq('approval_status', 'approved'),
        supabase.from('tiktok_accounts').select('id, user_id, followers_count, likes_count').in('user_id', clipperIds).eq('is_active', true).eq('approval_status', 'approved'),
        supabase.from('youtube_accounts').select('id, user_id, subscribers_count, total_views').in('user_id', clipperIds).eq('is_active', true).eq('approval_status', 'approved'),
      ]);

      const instagramAccountIds = (instagramAccs.data || []).map(a => a.id);
      const tiktokAccountIds = (tiktokAccs.data || []).map(a => a.id);
      const youtubeAccountIds = (youtubeAccs.data || []).map(a => a.id);

      // 5. Get posts/videos metrics
      let instagramPosts: any[] = [];
      let tiktokVideos: any[] = [];
      let youtubeVideos: any[] = [];

      if (instagramAccountIds.length > 0) {
        const { data } = await supabase
          .from('instagram_posts')
          .select('account_id, views_count, likes_count')
          .in('account_id', instagramAccountIds);
        instagramPosts = data || [];
      }

      if (tiktokAccountIds.length > 0) {
        const { data } = await supabase
          .from('tiktok_videos')
          .select('account_id, views_count, likes_count')
          .in('account_id', tiktokAccountIds);
        tiktokVideos = data || [];
      }

      if (youtubeAccountIds.length > 0) {
        const { data } = await supabase
          .from('youtube_videos')
          .select('account_id, views_count, likes_count')
          .in('account_id', youtubeAccountIds);
        youtubeVideos = data || [];
      }

      // Calculate Instagram metrics
      const instagramFollowers = (instagramAccs.data || []).reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
      const instagramViews = instagramPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const instagramLikes = instagramPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);

      // Calculate TikTok metrics
      const tiktokFollowers = (tiktokAccs.data || []).reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
      const tiktokViews = tiktokVideos.reduce((sum, p) => sum + Number(p.views_count || 0), 0);
      const tiktokLikes = (tiktokAccs.data || []).reduce((sum, acc) => sum + Number(acc.likes_count || 0), 0) + 
                          tiktokVideos.reduce((sum, p) => sum + (p.likes_count || 0), 0);

      // Calculate YouTube metrics
      const youtubeFollowers = (youtubeAccs.data || []).reduce((sum, acc) => sum + (acc.subscribers_count || 0), 0);
      const youtubeViews = (youtubeAccs.data || []).reduce((sum, acc) => sum + Number(acc.total_views || 0), 0) +
                           youtubeVideos.reduce((sum, p) => sum + Number(p.views_count || 0), 0);
      const youtubeLikes = youtubeVideos.reduce((sum, p) => sum + (p.likes_count || 0), 0);

      // Build top clippers list
      const clipperViewsMap = new Map<string, { views: number; platform: string }>();

      // Aggregate views by user from Instagram
      (instagramAccs.data || []).forEach(acc => {
        const userViews = instagramPosts
          .filter(p => p.account_id === acc.id)
          .reduce((sum, p) => sum + (p.views_count || 0), 0);
        const existing = clipperViewsMap.get(acc.user_id);
        if (!existing || userViews > existing.views) {
          clipperViewsMap.set(acc.user_id, { views: userViews, platform: 'Instagram' });
        }
      });

      // Aggregate views by user from TikTok
      (tiktokAccs.data || []).forEach(acc => {
        const userViews = tiktokVideos
          .filter(p => p.account_id === acc.id)
          .reduce((sum, p) => sum + Number(p.views_count || 0), 0);
        const existing = clipperViewsMap.get(acc.user_id);
        if (!existing || userViews > existing.views) {
          clipperViewsMap.set(acc.user_id, { views: userViews, platform: 'TikTok' });
        }
      });

      // Aggregate views by user from YouTube
      (youtubeAccs.data || []).forEach(acc => {
        const userViews = Number(acc.total_views || 0) + youtubeVideos
          .filter(p => p.account_id === acc.id)
          .reduce((sum, p) => sum + Number(p.views_count || 0), 0);
        const existing = clipperViewsMap.get(acc.user_id);
        if (!existing || userViews > existing.views) {
          clipperViewsMap.set(acc.user_id, { views: userViews, platform: 'YouTube' });
        }
      });

      const topClippers = Array.from(clipperViewsMap.entries())
        .map(([userId, data]) => {
          const profile = profileMap.get(userId);
          return {
            userId,
            username: profile?.username || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            totalViews: data.views,
            platform: data.platform,
          };
        })
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 5);

      const totalAccounts = (instagramAccs.data?.length || 0) + (tiktokAccs.data?.length || 0) + (youtubeAccs.data?.length || 0);

      return {
        totalFollowers: instagramFollowers + tiktokFollowers + youtubeFollowers,
        totalViews: instagramViews + tiktokViews + youtubeViews,
        totalLikes: instagramLikes + tiktokLikes + youtubeLikes,
        totalClippers: clipperIds.length,
        totalCampaigns: campaignIds.length,
        platformBreakdown: [
          {
            platform: 'Instagram',
            followers: instagramFollowers,
            views: instagramViews,
            likes: instagramLikes,
            accounts: instagramAccs.data?.length || 0,
          },
          {
            platform: 'TikTok',
            followers: tiktokFollowers,
            views: tiktokViews,
            likes: tiktokLikes,
            accounts: tiktokAccs.data?.length || 0,
          },
          {
            platform: 'YouTube',
            followers: youtubeFollowers,
            views: youtubeViews,
            likes: youtubeLikes,
            accounts: youtubeAccs.data?.length || 0,
          },
        ],
        topClippers,
      };
    },
    enabled: !!user?.id,
  });
}

function getEmptyMetrics(): ClientMetricsSummary {
  return {
    totalFollowers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalClippers: 0,
    totalCampaigns: 0,
    platformBreakdown: [
      { platform: 'Instagram', followers: 0, views: 0, likes: 0, accounts: 0 },
      { platform: 'TikTok', followers: 0, views: 0, likes: 0, accounts: 0 },
      { platform: 'YouTube', followers: 0, views: 0, likes: 0, accounts: 0 },
    ],
    topClippers: [],
  };
}

export function useClientPlatformDistribution() {
  const { data: metrics } = useClientMetrics();

  return (metrics?.platformBreakdown || [])
    .filter(p => p.views > 0 || p.followers > 0)
    .map(p => ({
      platform: p.platform,
      value: p.views,
    }));
}
