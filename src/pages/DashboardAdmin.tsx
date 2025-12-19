import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { ChartLineViews } from "@/components/Charts/ChartLineViews";
import { ChartPiePlatforms } from "@/components/Charts/ChartPiePlatforms";
import { ClippersTable } from "@/components/Tables/ClippersTable";
import { PayoutsTable } from "@/components/Tables/PayoutsTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useSocialMetrics, usePlatformDistribution } from "@/hooks/useSocialMetrics";
import { useAllInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useAllTikTokAccounts } from "@/hooks/useTikTokAccounts";
import { useAllYouTubeAccounts } from "@/hooks/useYouTubeAccounts";
import { 
  Trophy, 
  Users, 
  Eye, 
  Wallet, 
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

interface PendingClipper {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  status: string;
  applied_at: string;
  campaign_name: string;
}

interface PayoutRequest {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  amount: number;
  status: string;
  pix_key?: string;
  pix_type?: string;
  requested_at: string;
  available_balance?: number;
  total_earned?: number;
}

function DashboardAdminContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pendingClippers, setPendingClippers] = useState<PendingClipper[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRequest[]>([]);

  // Use social metrics hook
  const { data: socialMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useSocialMetrics();
  const platformData = usePlatformDistribution();

  // Get accounts for display
  const { data: instagramAccounts = [] } = useAllInstagramAccounts();
  const { data: tiktokAccounts = [] } = useAllTikTokAccounts();
  const { data: youtubeAccounts = [] } = useAllYouTubeAccounts();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch campaigns with stats
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

      // Fetch pending clippers
      const { data: clippersData } = await supabase
        .from('pending_campaign_participants')
        .select('*')
        .limit(10);
      
      if (clippersData) {
        setPendingClippers(clippersData);
      }

      // Fetch pending payouts
      const { data: payoutsData } = await supabase
        .from('payout_admin_view')
        .select('*')
        .eq('status', 'pending')
        .limit(10);
      
      if (payoutsData) {
        setPendingPayouts(payoutsData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchData(), refetchMetrics()]);
    toast.success('Dashboard atualizado!');
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
            <p className="text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Prepare chart data from platform breakdown
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
              Dashboard Admin
            </h1>
            <p className="text-muted-foreground mt-1">Visão geral de todas as métricas</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={() => navigate('/admin/campaigns')} variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              Campanhas
            </Button>
            <Button onClick={() => navigate('/account-analytics')} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Contas Sociais
            </Button>
            <Button onClick={() => navigate('/admin/create-campaign')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Social Media Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Seguidores Totais"
            value={formatNumber(socialMetrics?.totalFollowers || 0)}
            icon={Users}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Visualizações Totais"
            value={formatNumber(socialMetrics?.totalViews || 0)}
            icon={Eye}
            glowColor="green"
          />
          <MetricCardGlow
            title="Curtidas Totais"
            value={formatNumber(socialMetrics?.totalLikes || 0)}
            icon={TrendingUp}
            glowColor="purple"
          />
          <MetricCardGlow
            title="Vídeos/Posts"
            value={formatNumber(socialMetrics?.totalVideos || 0)}
            icon={Video}
            glowColor="orange"
          />
        </div>

        {/* Platform Cards */}
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
                <span className="text-sm text-muted-foreground">{platform.accounts} contas</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.followers)}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.views)}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(platform.likes)}</p>
                  <p className="text-xs text-muted-foreground">Curtidas</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartPiePlatforms 
            data={chartPlatformData.length > 0 ? chartPlatformData : [{ platform: 'Sem dados', value: 1 }]} 
            title="Distribuição por Plataforma" 
          />
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo de Contas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/20">
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <span>Instagram</span>
                </div>
                <span className="font-semibold">{instagramAccounts.length} contas</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-purple-500" />
                  <span>TikTok</span>
                </div>
                <span className="font-semibold">{tiktokAccounts.length} contas</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <Youtube className="h-5 w-5 text-red-500" />
                  <span>YouTube</span>
                </div>
                <span className="font-semibold">{youtubeAccounts.length} canais</span>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Tabs for Lists */}
        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList className="glass-card p-1 border border-border/30">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Trophy className="h-4 w-4 mr-2" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="clippers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="h-4 w-4 mr-2" />
              Clipadores Pendentes
              {pendingClippers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                  {pendingClippers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Wallet className="h-4 w-4 mr-2" />
              Saques Pendentes
              {pendingPayouts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                  {pendingPayouts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <GlowCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Lista de Campanhas</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/campaigns')}>
                  Ver todas
                </Button>
              </div>
              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada.</p>
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
                            {formatNumber(campaign.total_views)} views • {campaign.total_posts} posts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">{campaign.total_clippers} clipadores</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlowCard>
          </TabsContent>

          <TabsContent value="clippers">
            <GlowCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Clipadores Aguardando Aprovação</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
                  Ver todos
                </Button>
              </div>
              <ClippersTable 
                clippers={pendingClippers} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>

          <TabsContent value="payouts">
            <GlowCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Solicitações de Saque</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/payouts')}>
                  Ver todas
                </Button>
              </div>
              <PayoutsTable 
                payouts={pendingPayouts} 
                onRefresh={fetchData}
              />
            </GlowCard>
          </TabsContent>
        </Tabs>
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
