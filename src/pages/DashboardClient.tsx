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
import { useSocialMetrics, usePlatformDistribution } from "@/hooks/useSocialMetrics";
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function DashboardClientContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: socialMetrics, isLoading, refetch } = useSocialMetrics();
  const platformDistribution = usePlatformDistribution();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
  };

  // Generate chart data from platform breakdown
  const generateViewsChartData = () => {
    if (!socialMetrics?.platformBreakdown) {
      return [{ date: 'Instagram', views: 0 }, { date: 'TikTok', views: 0 }, { date: 'YouTube', views: 0 }];
    }
    
    return socialMetrics.platformBreakdown.map(p => ({
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

  const hasAccounts = socialMetrics && socialMetrics.accountsCount.total > 0;

  if (!hasAccounts) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="p-6 rounded-full bg-primary/10 mb-6 animate-pulse-glow">
            <BarChart3 className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-glow">
            {t('noAccountsLinked')}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('noAccountsDescription')}
          </p>
          <Button onClick={() => navigate('/account-analytics')} className="premium-gradient">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('addAccounts')}
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
              {t('clientDashboard')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('trackPerformance')}
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
              onClick={() => navigate('/account-analytics')}
              className="premium-gradient"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('viewDetails')}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title={t('followers')}
            value={formatNumber(socialMetrics?.totalFollowers || 0)}
            icon={Users}
            glowColor="blue"
          />
          <MetricCardGlow
            title={t('views')}
            value={formatNumber(socialMetrics?.totalViews || 0)}
            icon={Eye}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('likes')}
            value={formatNumber(socialMetrics?.totalLikes || 0)}
            icon={Heart}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('accounts')}
            value={socialMetrics?.accountsCount.total || 0}
            icon={Video}
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

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instagram */}
          <GlowCard className="p-6" glowColor="purple">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Instagram className="h-6 w-6 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold">Instagram</h3>
                <p className="text-sm text-muted-foreground">
                  {socialMetrics?.accountsCount.instagram || 0} {t('accounts')}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('followers')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.followers || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('views')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.views || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('likes')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.likes || 0)}
                </span>
              </div>
            </div>
          </GlowCard>

          {/* TikTok */}
          <GlowCard className="p-6" glowColor="blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Video className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">TikTok</h3>
                <p className="text-sm text-muted-foreground">
                  {socialMetrics?.accountsCount.tiktok || 0} {t('accounts')}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('followers')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.followers || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('views')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.views || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('likes')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.likes || 0)}
                </span>
              </div>
            </div>
          </GlowCard>

          {/* YouTube */}
          <GlowCard className="p-6" glowColor="orange">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Youtube className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold">YouTube</h3>
                <p className="text-sm text-muted-foreground">
                  {socialMetrics?.accountsCount.youtube || 0} {t('accounts')}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('followers')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.followers || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('views')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.views || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('likes')}</span>
                <span className="font-semibold">
                  {formatNumber(socialMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.likes || 0)}
                </span>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Quick Actions */}
        <GlowCard className="p-6" glowColor="primary">
          <h3 className="text-lg font-semibold mb-4">{t('quickActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/account-analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>{t('manageAccounts')}</span>
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
