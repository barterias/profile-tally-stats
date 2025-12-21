import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { ChartLineViews } from "@/components/Charts/ChartLineViews";
import { ChartPiePlatforms } from "@/components/Charts/ChartPiePlatforms";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClientMetrics, useClientPlatformDistribution } from "@/hooks/useClientMetrics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Eye, 
  Video,
  RefreshCw,
  Sparkles,
  BarChart3,
  Heart,
  Instagram,
  Youtube,
  Trophy,
  Target,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function DashboardClientContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: clientMetrics, isLoading, refetch } = useClientMetrics();
  const platformDistribution = useClientPlatformDistribution();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
  };

  const generateViewsChartData = () => {
    if (!clientMetrics?.platformBreakdown) {
      return [{ date: 'Instagram', views: 0 }, { date: 'TikTok', views: 0 }, { date: 'YouTube', views: 0 }];
    }
    
    return clientMetrics.platformBreakdown.map(p => ({
      date: p.platform,
      views: p.views
    }));
  };

  const generatePieData = () => {
    if (!platformDistribution || platformDistribution.length === 0) {
      return [{ platform: t('noData'), value: 1 }];
    }
    return platformDistribution;
  };

  if (isLoading) {
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

  const hasCampaigns = clientMetrics && clientMetrics.totalCampaigns > 0;

  if (!hasCampaigns) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="p-6 rounded-full bg-primary/10 mb-6 animate-pulse-glow">
            <Target className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-glow">
            {t('dashboard.no_campaigns_found')}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('dashboard.no_campaigns_desc')}
          </p>
          <Button onClick={() => navigate('/client/campaigns')} className="premium-gradient">
            <Target className="h-4 w-4 mr-2" />
            {t('dashboard.manage_campaigns')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-glow">
              {t('dashboard.client_title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.client_subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              className="hover-glow"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button 
              onClick={() => navigate('/client/campaigns')}
              className="premium-gradient"
            >
              <Target className="h-4 w-4 mr-2" />
              {t('nav.campaigns')}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCardGlow
            title={t('nav.campaigns')}
            value={clientMetrics?.totalCampaigns || 0}
            icon={Target}
            glowColor="orange"
          />
          <MetricCardGlow
            title={t('clippers')}
            value={clientMetrics?.totalClippers || 0}
            icon={Users}
            glowColor="blue"
          />
          <MetricCardGlow
            title={t('views')}
            value={formatNumber(clientMetrics?.totalViews || 0)}
            icon={Eye}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('likes')}
            value={formatNumber(clientMetrics?.totalLikes || 0)}
            icon={Heart}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('followers')}
            value={formatNumber(clientMetrics?.totalFollowers || 0)}
            icon={Users}
            glowColor="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLineViews 
            data={generateViewsChartData()} 
            title={t('viewsByPlatform')}
          />
          <ChartPiePlatforms 
            data={generatePieData()} 
            title={t('platformDistribution')}
          />
        </div>

        {/* Top Clippers & Platform Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clippers */}
          <GlowCard className="p-6" glowColor="orange">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h3 className="text-lg font-semibold">Top Clippers</h3>
            </div>
            {clientMetrics?.topClippers && clientMetrics.topClippers.length > 0 ? (
              <div className="space-y-3">
                {clientMetrics.topClippers.map((clipper, index) => (
                  <div key={clipper.userId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10">
                    <span className="text-lg font-bold text-primary w-6">#{index + 1}</span>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={clipper.avatarUrl || undefined} />
                      <AvatarFallback>{clipper.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{clipper.username}</p>
                      <p className="text-xs text-muted-foreground">{clipper.platform}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(clipper.totalViews)}</p>
                      <p className="text-xs text-muted-foreground">{t('views')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t('dashboard.no_clipper_metrics')}
              </p>
            )}
          </GlowCard>

          {/* Platform Breakdown */}
          <div className="space-y-4">
            {/* Instagram */}
            <GlowCard className="p-4" glowColor="purple">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <Instagram className="h-5 w-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Instagram</h3>
                  <p className="text-xs text-muted-foreground">
                    {clientMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.accounts || 0} {t('dashboard.accounts')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatNumber(clientMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.views || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('views')}</p>
                </div>
              </div>
            </GlowCard>

            {/* TikTok */}
            <GlowCard className="p-4" glowColor="blue">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Video className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">TikTok</h3>
                  <p className="text-xs text-muted-foreground">
                    {clientMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.accounts || 0} {t('dashboard.accounts')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatNumber(clientMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.views || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('views')}</p>
                </div>
              </div>
            </GlowCard>

            {/* YouTube */}
            <GlowCard className="p-4" glowColor="orange">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Youtube className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">YouTube</h3>
                  <p className="text-xs text-muted-foreground">
                    {clientMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.accounts || 0} {t('dashboard.accounts')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatNumber(clientMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.views || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('views')}</p>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Quick Actions */}
        <GlowCard className="p-6" glowColor="primary">
          <h3 className="text-lg font-semibold mb-4">{t('quickActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/client/campaigns')}
            >
              <Target className="h-6 w-6" />
              <span>{t('dashboard.manage_campaigns')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/profile')}
            >
              <Users className="h-6 w-6" />
              <span>{t('nav.profile')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-6 w-6" />
              <span>{t('syncData')}</span>
            </Button>
          </div>
        </GlowCard>
      </div>
    </MainLayout>
  );
}

export default function DashboardClient() {
  return (
    <ProtectedRoute>
      <DashboardClientContent />
    </ProtectedRoute>
  );
}
