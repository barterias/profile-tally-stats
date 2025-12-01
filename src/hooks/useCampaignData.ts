import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Campaign, RankingItem, CampaignType } from '@/types/campaign';
import { toast } from 'sonner';

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

      // Fetch summary from view
      const { data: summaryData } = await supabase
        .from('campaign_summary')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (summaryData) {
        setSummary({
          total_views: Number(summaryData.total_views || 0),
          total_posts: Number(summaryData.total_posts || 0),
          total_clippers: Number(summaryData.total_clippers || 0),
          total_likes: Number(summaryData.total_likes || 0),
          total_comments: Number(summaryData.total_comments || 0),
          total_shares: Number(summaryData.total_shares || 0),
          engagement_rate: Number(summaryData.engagement_rate || 0),
        });
      } else {
        // Fallback: calculate from videos directly
        const { data: videos } = await supabase
          .from('campaign_videos')
          .select('*')
          .eq('campaign_id', campaignId);

        const { data: participants } = await supabase
          .from('campaign_participants')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('status', 'approved');

        const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;
        const totalLikes = videos?.reduce((sum, v) => sum + (v.likes || 0), 0) || 0;
        const totalComments = videos?.reduce((sum, v) => sum + (v.comments || 0), 0) || 0;
        const totalShares = videos?.reduce((sum, v) => sum + (v.shares || 0), 0) || 0;
        
        setSummary({
          total_views: totalViews,
          total_posts: videos?.length || 0,
          total_clippers: participants?.length || 0,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: totalShares,
          engagement_rate: totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0,
        });
      }

      // Fetch ranking
      const { data: rankingData } = await supabase
        .from('ranking_views')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('rank_position', { ascending: true })
        .limit(20);

      // Calculate earnings for each user based on campaign type
      const rankingWithEarnings = (rankingData || []).map(item => {
        let earnings = 0;
        if (campaignData.campaign_type === 'pay_per_view') {
          earnings = (Number(item.total_views || 0) / 1000) * Number(campaignData.payment_rate || 0);
        }
        return {
          user_id: item.user_id,
          username: item.username || 'Usuário',
          avatar_url: item.avatar_url,
          total_videos: Number(item.total_videos || 0),
          total_views: Number(item.total_views || 0),
          total_likes: Number(item.total_likes || 0),
          rank_position: Number(item.rank_position || 0),
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
