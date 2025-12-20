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
import { useRecentPosts, useMostViralPost, UnifiedPost } from "@/hooks/useClipperPosts";
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
  ExternalLink,
  Crown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function DashboardClipperContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: socialMetrics, isLoading, refetch } = useSocialMetrics();
  const platformDistribution = usePlatformDistribution();
  const { data: recentPosts, isLoading: loadingPosts } = useRecentPosts(5);
  const { data: viralPost, isLoading: loadingViral } = useMostViralPost();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    queryClient.invalidateQueries({ queryKey: ['clipper-posts'] });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-400" />;
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-400" />;
      case 'tiktok':
        return <Video className="h-4 w-4 text-blue-400" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'bg-pink-500/20 border-pink-500/30';
      case 'youtube':
        return 'bg-red-500/20 border-red-500/30';
      case 'tiktok':
        return 'bg-blue-500/20 border-blue-500/30';
      default:
        return 'bg-muted';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
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

        {/* Stats Grid - Removed total earned */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Recent Posts & Viral Post */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Posts */}
          <GlowCard className="p-6" glowColor="blue">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Video className="h-5 w-5" />
              Posts Recentes
            </h3>
            {loadingPosts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentPosts && recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} formatNumber={formatNumber} formatDate={formatDate} getPlatformIcon={getPlatformIcon} getPlatformColor={getPlatformColor} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum post encontrado
              </p>
            )}
          </GlowCard>

          {/* Most Viral Post */}
          <GlowCard className="p-6" glowColor="orange">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Post Mais Viral
            </h3>
            {loadingViral ? (
              <div className="h-32 bg-muted/20 rounded-lg animate-pulse" />
            ) : viralPost ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {viralPost.thumbnail_url ? (
                    <img
                      src={viralPost.thumbnail_url}
                      alt="Thumbnail"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted/30 rounded-lg flex items-center justify-center">
                      {getPlatformIcon(viralPost.platform)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(viralPost.platform)} mb-2`}>
                      {getPlatformIcon(viralPost.platform)}
                      <span className="capitalize">{viralPost.platform}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {viralPost.title || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(viralPost.posted_at)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-glow">{formatNumber(viralPost.views_count)}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatNumber(viralPost.likes_count)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatNumber(viralPost.comments_count)}</p>
                    <p className="text-xs text-muted-foreground">Comentários</p>
                  </div>
                </div>
                <a
                  href={viralPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver post
                </a>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum post encontrado
              </p>
            )}
          </GlowCard>
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

// PostCard component for recent posts
interface PostCardProps {
  post: UnifiedPost;
  formatNumber: (num: number) => string;
  formatDate: (dateStr: string | null) => string;
  getPlatformIcon: (platform: string) => React.ReactNode;
  getPlatformColor: (platform: string) => string;
}

function PostCard({ post, formatNumber, formatDate, getPlatformIcon, getPlatformColor }: PostCardProps) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group"
    >
      {post.thumbnail_url ? (
        <img
          src={post.thumbnail_url}
          alt="Thumbnail"
          className="w-12 h-12 object-cover rounded-lg"
        />
      ) : (
        <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center">
          {getPlatformIcon(post.platform)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${getPlatformColor(post.platform)}`}>
            {getPlatformIcon(post.platform)}
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(post.posted_at)}</span>
        </div>
        <p className="text-sm truncate">
          {post.title || 'Sem título'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatNumber(post.views_count)}</p>
        <p className="text-xs text-muted-foreground">views</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

export default function DashboardClipper() {
  return (
    <ProtectedRoute>
      <DashboardClipperContent />
    </ProtectedRoute>
  );
}
