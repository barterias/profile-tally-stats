import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { ChartPiePlatforms } from "@/components/Charts/ChartPiePlatforms";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useSocialMetrics } from "@/hooks/useSocialMetrics";
import { useAllInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useAllTikTokAccounts } from "@/hooks/useTikTokAccounts";
import { useAllYouTubeAccounts } from "@/hooks/useYouTubeAccounts";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Trophy, 
  Users, 
  Eye, 
  Plus, 
  Video,
  TrendingUp,
  RefreshCw,
  Instagram,
  Youtube,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface CampaignSummary {
  id: string;
  name: string;
  is_active: boolean;
  total_views: number;
  total_posts: number;
  total_clippers: number;
}

function DashboardAdminContent() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  // Use social metrics hook - real data from API
  const { data: socialMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useSocialMetrics();

  // Get accounts for display - real data from API
  const { data: instagramAccounts = [] } = useAllInstagramAccounts();
  const { data: tiktokAccounts = [] } = useAllTikTokAccounts();
  const { data: youtubeAccounts = [] } = useAllYouTubeAccounts();

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for social accounts
    const channel = supabase
      .channel('admin-social-accounts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instagram_accounts' },
        () => refetchMetrics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tiktok_accounts' },
        () => refetchMetrics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'youtube_accounts' },
        () => refetchMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch campaigns with stats from database
      const { data: campaignsData } = await supabase
        .from('campaign_summary')
        .select('*');

      if (campaignsData) {
        setCampaigns(campaignsData.map(c => ({
          id: c.id || '',
          name: c.name || '',
          is_active: c.is_active || false,
          total_views: Number(c.total_views || 0),
          total_posts: Number(c.total_posts || 0),
          total_clippers: Number(c.total_clippers || 0),
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(t('msg.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchData(), refetchMetrics()]);
    toast.success(t('common.refresh') + '!');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  if (loading || metricsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground">{t('loadingDashboard')}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Prepare chart data from platform breakdown - real data from social accounts
  const chartPlatformData = socialMetrics?.platformBreakdown
    .filter(p => p.views > 0)
    .map(p => ({
      platform: p.platform,
      value: p.views,
    })) || [];

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-glow">
              {t('dashboard.title')} Admin
            </h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button onClick={() => navigate('/admin/campaigns')} variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              {t('nav.campaigns')}
            </Button>
            <Button onClick={() => navigate('/account-analytics')} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('accounts')}
            </Button>
            <Button onClick={() => navigate('/admin/create-campaign')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('campaigns.new_campaign')}
            </Button>
          </div>
        </div>

        {/* Social Media Stats Grid - Real data from useSocialMetrics hook */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title={t('followers')}
            value={formatNumber(socialMetrics?.totalFollowers || 0)}
            icon={Users}
            glowColor="blue"
          />
          <MetricCardGlow
            title={t('dashboard.total_views')}
            value={formatNumber(socialMetrics?.totalViews || 0)}
            icon={Eye}
            glowColor="green"
          />
          <MetricCardGlow
            title={t('totalLikes')}
            value={formatNumber(socialMetrics?.totalLikes || 0)}
            icon={TrendingUp}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('videos')}
            value={formatNumber(socialMetrics?.totalVideos || 0)}
            icon={Video}
            glowColor="orange"
          />
        </div>

        {/* Platform Cards - Real data from social accounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {socialMetrics?.platformBreakdown.map((platform) => (
            <GlowCard key={platform.platform} className="p-5" glowColor={
              platform.platform === 'Instagram' ? 'purple' :
              platform.platform === 'TikTok' ? 'blue' : 'orange'
            }>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {platform.platform === 'Instagram' && <Instagram className="h-6 w-6 text-pink-500" />}
                  {platform.platform === 'TikTok' && <Video className="h-6 w-6 text-purple-500" />}
                  {platform.platform === 'YouTube' && <Youtube className="h-6 w-6 text-red-500" />}
                  <h3 className="font-semibold">{platform.platform}</h3>
                </div>
                <span className="text-sm text-muted-foreground">{platform.accounts} {t('accounts')}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.followers)}</p>
                  <p className="text-xs text-muted-foreground">{t('followers')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.views)}</p>
                  <p className="text-xs text-muted-foreground">{t('views')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.likes)}</p>
                  <p className="text-xs text-muted-foreground">{t('likes')}</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartPiePlatforms 
            data={chartPlatformData.length > 0 ? chartPlatformData : [{ platform: t('noData'), value: 1 }]} 
            title={t('dashboard.platform_distribution')} 
          />
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('socialMediaOverview')}</h3>
            <div className="space-y-4">
              {instagramAccounts.length > 0 && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <span>Instagram</span>
                    </div>
                    <span className="font-semibold">{instagramAccounts.length} {t('accounts')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {instagramAccounts.slice(0, 3).map((acc) => (
                      <div key={acc.id} className="text-muted-foreground">
                        @{acc.username} - {formatNumber(acc.followers_count || 0)} {t('followers')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tiktokAccounts.length > 0 && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-purple-500" />
                      <span>TikTok</span>
                    </div>
                    <span className="font-semibold">{tiktokAccounts.length} {t('accounts')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {tiktokAccounts.slice(0, 3).map((acc) => (
                      <div key={acc.id} className="text-muted-foreground">
                        @{acc.username} - {formatNumber(acc.followers_count || 0)} {t('followers')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {youtubeAccounts.length > 0 && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <span>YouTube</span>
                    </div>
                    <span className="font-semibold">{youtubeAccounts.length} {t('accounts')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {youtubeAccounts.slice(0, 3).map((acc) => (
                      <div key={acc.id} className="text-muted-foreground">
                        @{acc.username} - {formatNumber(acc.subscribers_count || 0)} subs
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {instagramAccounts.length === 0 && tiktokAccounts.length === 0 && youtubeAccounts.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {t('noAccountsAdded')}
                </p>
              )}
            </div>
          </GlowCard>
        </div>

        {/* Campaigns List */}
        <GlowCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('campaigns.title')}</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/campaigns')}>
              {t('common.view')}
            </Button>
          </div>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('campaigns.no_campaigns_found')}</p>
            ) : (
              campaigns.slice(0, 5).map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${campaign.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(campaign.total_views)} {t('views')} • {campaign.total_posts} posts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{campaign.total_clippers} {t('clippers')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlowCard>
      </div>
    </MainLayout>
  );
}

export default function DashboardAdmin() {
  return (
    <ProtectedRoute requireAdmin>
      <DashboardAdminContent />
    </ProtectedRoute>
  );
}
