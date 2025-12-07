import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PrizeConfig } from './useCompetitionPrizes';

export interface PaymentRecord {
  id: string;
  campaign_id: string;
  user_id: string;
  period_type: 'daily' | 'monthly' | 'pay_per_view';
  period_date: string;
  amount: number;
  views_count: number;
  videos_count: number;
  position: number | null;
  status: 'pending' | 'approved' | 'paid';
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ClipperEarning {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_views: number;
  total_videos: number;
  position: number;
  calculated_amount: number;
  payment_status: 'pending' | 'approved' | 'paid' | 'not_created';
  payment_record_id?: string;
}

interface CampaignInfo {
  campaign_type: string;
  payment_rate: number;
  min_views: number;
  max_paid_views: number;
  prize_pool: number;
}

export function useCampaignPayments(campaignId: string | null, periodType: 'daily' | 'monthly', periodDate: Date) {
  const [clippers, setClippers] = useState<ClipperEarning[]>([]);
  const [prizes, setPrizes] = useState<PrizeConfig[]>([]);
  const [campaignInfo, setCampaignInfo] = useState<CampaignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  const fetchData = async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch campaign info
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('campaign_type, payment_rate, min_views, max_paid_views, prize_pool')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        setCampaignInfo({
          campaign_type: campaign.campaign_type || 'pay_per_view',
          payment_rate: campaign.payment_rate || 0,
          min_views: campaign.min_views || 0,
          max_paid_views: campaign.max_paid_views || 0,
          prize_pool: campaign.prize_pool || 0,
        });
      }

      // Fetch competition prizes if applicable
      const { data: prizeData } = await supabase
        .from('competition_prizes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true });

      setPrizes(prizeData || []);

      // Determine date range based on period type
      const startDate = periodType === 'monthly' 
        ? new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
        : new Date(periodDate);
      const endDate = periodType === 'monthly'
        ? new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
        : new Date(periodDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Fetch videos with metrics for this period
      const { data: videos } = await supabase
        .from('campaign_videos')
        .select(`
          id,
          submitted_by,
          views,
          likes,
          comments,
          shares,
          submitted_at
        `)
        .eq('campaign_id', campaignId)
        .gte('submitted_at', startDate.toISOString())
        .lte('submitted_at', endDate.toISOString());

      // Aggregate by user
      const userStats = new Map<string, { views: number; videos: number }>();
      (videos || []).forEach(video => {
        if (video.submitted_by) {
          const current = userStats.get(video.submitted_by) || { views: 0, videos: 0 };
          userStats.set(video.submitted_by, {
            views: current.views + (video.views || 0),
            videos: current.videos + 1,
          });
        }
      });

      // Fetch user profiles
      const userIds = Array.from(userStats.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch existing payment records for this period
      const periodDateStr = periodDate.toISOString().split('T')[0];
      const { data: paymentRecords } = await supabase
        .from('campaign_payment_records')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('period_type', periodType)
        .eq('period_date', periodDateStr);

      const paymentMap = new Map((paymentRecords || []).map(p => [p.user_id, p]));

      // Calculate earnings and build clipper list
      const clipperList: ClipperEarning[] = [];
      userStats.forEach((stats, userId) => {
        const profile = profileMap.get(userId);
        const paymentRecord = paymentMap.get(userId);
        
        clipperList.push({
          user_id: userId,
          username: profile?.username || 'Usuário',
          avatar_url: profile?.avatar_url,
          total_views: stats.views,
          total_videos: stats.videos,
          position: 0,
          calculated_amount: 0,
          payment_status: paymentRecord?.status as any || 'not_created',
          payment_record_id: paymentRecord?.id,
        });
      });

      // Sort by views and assign positions
      clipperList.sort((a, b) => b.total_views - a.total_views);
      clipperList.forEach((clipper, index) => {
        clipper.position = index + 1;
      });

      // Calculate amounts based on campaign type
      const campaignType = campaign?.campaign_type || 'pay_per_view';
      clipperList.forEach(clipper => {
        if (campaignType === 'pay_per_view') {
          const minViews = campaign?.min_views || 0;
          const maxPaidViews = campaign?.max_paid_views || Infinity;
          const rate = campaign?.payment_rate || 0;
          
          if (clipper.total_views >= minViews) {
            const eligibleViews = Math.min(clipper.total_views, maxPaidViews);
            clipper.calculated_amount = (eligibleViews / 1000) * rate;
          }
        } else if (campaignType === 'competition_daily' || campaignType === 'competition_monthly') {
          const prize = (prizeData || []).find(p => p.position === clipper.position);
          clipper.calculated_amount = prize?.prize_amount || 0;
        } else if (campaignType === 'fixed') {
          clipper.calculated_amount = (campaign?.payment_rate || 0) * clipper.total_videos;
        }
      });

      setClippers(clipperList);

      // Calculate totals
      let pending = 0;
      let paid = 0;
      clipperList.forEach(c => {
        if (c.payment_status === 'paid') {
          paid += c.calculated_amount;
        } else {
          pending += c.calculated_amount;
        }
      });
      setTotalPending(pending);
      setTotalPaid(paid);

    } catch (error) {
      console.error('Error fetching campaign payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [campaignId, periodType, periodDate]);

  const processPayment = async (userId: string, amount: number, notes?: string) => {
    if (!campaignId) return { success: false, error: 'No campaign selected' };

    const periodDateStr = periodDate.toISOString().split('T')[0];
    const clipper = clippers.find(c => c.user_id === userId);
    
    try {
      // Start transaction-like operations
      
      // 1. Create or update payment record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('campaign_payment_records')
        .upsert({
          campaign_id: campaignId,
          user_id: userId,
          period_type: periodType,
          period_date: periodDateStr,
          amount: amount,
          views_count: clipper?.total_views || 0,
          videos_count: clipper?.total_videos || 0,
          position: clipper?.position,
          status: 'paid',
          paid_at: new Date().toISOString(),
          notes: notes,
        }, {
          onConflict: 'campaign_id,user_id,period_type,period_date',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Update or create user wallet
      const { data: existingWallet } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingWallet) {
        const { error: walletError } = await supabase
          .from('user_wallets')
          .update({
            available_balance: existingWallet.available_balance + amount,
            total_earned: existingWallet.total_earned + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (walletError) throw walletError;
      } else {
        const { error: walletError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: userId,
            available_balance: amount,
            total_earned: amount,
            pending_balance: 0,
            total_withdrawn: 0,
          });

        if (walletError) throw walletError;
      }

      // 3. Create wallet transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          type: 'earning',
          description: `Pagamento campanha - ${periodType === 'daily' ? 'Diário' : 'Mensal'} - ${periodDateStr}`,
          reference_id: paymentRecord.id,
        });

      if (transactionError) throw transactionError;

      // Refresh data
      await fetchData();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error processing payment:', error);
      return { success: false, error: error.message };
    }
  };

  const processAllPayments = async (notes?: string) => {
    const unpaidClippers = clippers.filter(c => c.payment_status !== 'paid' && c.calculated_amount > 0);
    
    for (const clipper of unpaidClippers) {
      await processPayment(clipper.user_id, clipper.calculated_amount, notes);
    }
    
    await fetchData();
  };

  return {
    clippers,
    prizes,
    campaignInfo,
    loading,
    totalPending,
    totalPaid,
    processPayment,
    processAllPayments,
    refetch: fetchData,
  };
}
