import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Campaign, RankingItem, CampaignType } from '@/types/campaign';
import { toast } from 'sonner';

// Normaliza um link de vídeo para comparação
function normalizeLink(link: string | undefined | null): string {
  if (!link) return "";
  let normalized = link.split("?")[0];
  normalized = normalized.replace(/\/$/, "");
  normalized = normalized.toLowerCase();
  return normalized;
}

interface CampaignSummary {
  total_views: number;
  total_posts: number;
  total_clippers: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  engagement_rate: number;
}

interface PlatformData {
  platform: string;
  value: number;
}

export function useCampaignData(campaignId: string | null) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [pendingClippers, setPendingClippers] = useState<any[]>([]);
  const [approvedClippers, setApprovedClippers] = useState<any[]>([]);

  const fetchCampaignData = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      
      setCampaign({
        ...campaignData,
        campaign_type: (campaignData.campaign_type || 'pay_per_view') as CampaignType,
        payment_rate: Number(campaignData.payment_rate || 0),
        min_views: Number(campaignData.min_views || 0),
        max_paid_views: Number(campaignData.max_paid_views || 0),
        prize_pool: Number(campaignData.prize_pool || 0),
      });

      // Fetch videos da campanha
      const { data: videos } = await supabase
        .from('campaign_videos')
        .select('*')
        .eq('campaign_id', campaignId);

      const { data: participants } = await supabase
        .from('campaign_participants')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');

      // Buscar métricas reais das tabelas locais de analytics
      const videoLinks = (videos || []).map(v => v.video_link).filter(Boolean);
      
      // Build metrics map from local analytics tables
      const metricsMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();

      if (videoLinks.length > 0) {
        const [igRes, ttRes, ytRes, kwRes] = await Promise.all([
          supabase.from('instagram_posts').select('post_url, views_count, likes_count, comments_count, shares_count'),
          supabase.from('tiktok_videos').select('video_url, views_count, likes_count, comments_count, shares_count'),
          supabase.from('youtube_videos').select('video_url, views_count, likes_count, comments_count'),
          supabase.from('kwai_videos').select('video_url, views_count, likes_count, comments_count, shares_count'),
        ]);

        const addToMap = (url: string | null, views: number, likes: number, comments: number, shares: number) => {
          if (!url) return;
          const key = normalizeLink(url);
          if (key) {
            const existing = metricsMap.get(key);
            if (!existing || views > existing.views) {
              metricsMap.set(key, { views, likes, comments, shares });
            }
          }
        };

        igRes.data?.forEach((p: any) => addToMap(p.post_url, p.views_count || 0, p.likes_count || 0, p.comments_count || 0, p.shares_count || 0));
        ttRes.data?.forEach((p: any) => addToMap(p.video_url, p.views_count || 0, p.likes_count || 0, p.comments_count || 0, p.shares_count || 0));
        ytRes.data?.forEach((p: any) => addToMap(p.video_url, p.views_count || 0, p.likes_count || 0, p.comments_count || 0, 0));
        (kwRes.data as any[])?.forEach((p: any) => addToMap(p.video_url, p.views_count || 0, p.likes_count || 0, p.comments_count || 0, p.shares_count || 0));
      }

      // Calcular totais usando métricas locais, com fallback para campaign_videos
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      for (const video of (videos || [])) {
        const normalized = normalizeLink(video.video_link);
        const metrics = metricsMap.get(normalized);
        if (metrics && metrics.views > 0) {
          totalViews += metrics.views;
          totalLikes += metrics.likes;
          totalComments += metrics.comments;
          totalShares += metrics.shares;
        } else {
          // Fallback: use campaign_videos stored metrics
          totalViews += Number(video.views || 0);
          totalLikes += Number(video.likes || 0);
          totalComments += Number(video.comments || 0);
          totalShares += Number(video.shares || 0);
        }
      }

      setSummary({
        total_views: totalViews,
        total_posts: videos?.length || 0,
        total_clippers: participants?.length || 0,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        engagement_rate: totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0,
      });

      // Fetch ranking from ranking_views
      const { data: rankingData } = await supabase
        .from('ranking_views')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('rank_position', { ascending: true })
        .limit(20);

      // Calculate earnings based on campaign type
      const prizeDistribution = [0.5, 0.3, 0.2];
      const prizePool = Number(campaignData.prize_pool || 0);
      const paymentRate = Number(campaignData.payment_rate || 0);

      const rankingWithEarnings = (rankingData || []).map(item => {
        let earnings = 0;
        const position = Number(item.rank_position || 0);
        const views = Number(item.total_views || 0);

        if (campaignData.campaign_type === 'pay_per_view') {
          earnings = (views / 1000) * paymentRate;
        } else if (campaignData.campaign_type === 'competition_daily' || campaignData.campaign_type === 'competition_monthly') {
          if (position >= 1 && position <= 3 && prizePool > 0) {
            earnings = prizePool * prizeDistribution[position - 1];
          }
        } else if (campaignData.campaign_type === 'fixed') {
          const videoCount = Number(item.total_videos || 0);
          earnings = videoCount * paymentRate;
        }

        return {
          user_id: item.user_id || '',
          username: item.username || 'Usuário',
          avatar_url: item.avatar_url,
          total_videos: Number(item.total_videos || 0),
          total_views: views,
          total_likes: Number(item.total_likes || 0),
          rank_position: position,
          estimated_earnings: earnings,
        };
      });

      setRanking(rankingWithEarnings);

      // Fetch platform distribution
      const { data: platformDistData } = await supabase
        .from('campaign_platform_distribution')
        .select('*')
        .eq('campaign_id', campaignId);

      if (platformDistData && platformDistData.length > 0) {
        setPlatformData(platformDistData.map(p => ({
          platform: p.platform || 'Outros',
          value: Number(p.total_views || 0),
        })));
      } else {
        setPlatformData([]);
      }

      // Fetch pending clippers
      const { data: pendingData } = await supabase
        .from('pending_campaign_participants')
        .select('*')
        .eq('campaign_id', campaignId);

      setPendingClippers(pendingData || []);

      // Fetch approved clippers
      const { data: approvedData } = await supabase
        .from('approved_campaign_participants')
        .select('*')
        .eq('campaign_id', campaignId);

      setApprovedClippers(approvedData || []);

    } catch (error) {
      console.error('Erro ao carregar dados da campanha:', error);
      toast.error('Erro ao carregar dados da campanha');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  return {
    loading,
    refreshing,
    campaign,
    summary,
    ranking,
    platformData,
    pendingClippers,
    approvedClippers,
    refresh: fetchCampaignData,
  };
}
