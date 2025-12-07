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
import { externalSupabase } from "@/lib/externalSupabase";
import { 
  Trophy, 
  Users, 
  Eye, 
  Wallet, 
  Plus, 
  Video,
  TrendingUp,
  UserCheck,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CampaignSummary {
  id: string;
  name: string;
  is_active: boolean;
  total_views: number;
  total_posts: number;
  total_clippers: number;
  engagement_rate: number;
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
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [allCampaigns, setAllCampaigns] = useState<CampaignSummary[]>([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalClippers: 0,
    totalViews: 0,
    pendingPayouts: 0
  });
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pendingClippers, setPendingClippers] = useState<PendingClipper[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRequest[]>([]);
  const [viewsData, setViewsData] = useState<{ date: string; views: number }[]>([]);
  const [platformData, setPlatformData] = useState<{ platform: string; value: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (allCampaigns.length > 0) {
      updateFilteredStats();
    }
  }, [selectedCampaign, allCampaigns]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all external videos for metrics
      const [externalVideos, socialVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      const allExternalVideos = [...externalVideos, ...socialVideos];
      const totalExternalViews = allExternalVideos.reduce((sum, v) => sum + (v.views || 0), 0);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*');

      // Fetch campaign videos to match with external
      const { data: campaignVideosData } = await supabase
        .from('campaign_videos')
        .select('*');

      // Fetch participants count
      const { data: participantsData } = await supabase
        .from('campaign_participants')
        .select('campaign_id, user_id')
        .eq('status', 'approved');

      // Create metrics map from external videos
      const normalizeLink = (link: string | undefined | null): string => {
        if (!link) return "";
        let normalized = link.split("?")[0];
        normalized = normalized.replace(/\/$/, "");
        normalized = normalized.toLowerCase();
        return normalized;
      };

      const metricsMap = new Map<string, { views: number; likes: number; platform: string }>();
      for (const video of allExternalVideos) {
        const link = normalizeLink(video.link || video.video_url);
        if (link) {
          metricsMap.set(link, {
            views: video.views || 0,
            likes: video.likes || 0,
            platform: video.platform || 'instagram',
          });
        }
      }

      // Calculate stats per campaign using external metrics
      const campaignStats: CampaignSummary[] = (campaignsData || []).map(campaign => {
        const campaignVids = campaignVideosData?.filter(v => v.campaign_id === campaign.id) || [];
        const campaignParticipants = new Set(participantsData?.filter(p => p.campaign_id === campaign.id).map(p => p.user_id)).size;
        
        let totalViews = 0;
        let totalLikes = 0;
        let instagramViews = 0;
        let tiktokViews = 0;

        for (const vid of campaignVids) {
          const normalized = normalizeLink(vid.video_link);
          const metrics = metricsMap.get(normalized);
          if (metrics) {
            totalViews += metrics.views;
            totalLikes += metrics.likes;
            if (metrics.platform === 'instagram') {
              instagramViews += metrics.views;
            } else if (metrics.platform === 'tiktok') {
              tiktokViews += metrics.views;
            }
          }
        }

        return {
          id: campaign.id,
          name: campaign.name,
          is_active: campaign.is_active,
          total_views: totalViews,
          total_posts: campaignVids.length,
          total_clippers: campaignParticipants,
          engagement_rate: totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0,
        };
      });
      
      setAllCampaigns(campaignStats);
      setCampaigns(campaignStats);
      
      const grandTotalViews = campaignStats.reduce((acc, c) => acc + c.total_views, 0);
      const grandTotalClippers = campaignStats.reduce((acc, c) => acc + c.total_clippers, 0);
      
      setStats({
        totalCampaigns: campaignStats.length,
        totalViews: grandTotalViews,
        totalClippers: grandTotalClippers,
        pendingPayouts: 0
      });

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
        setStats(prev => ({ ...prev, pendingPayouts: payoutsData.length }));
      }

      // Calculate platform distribution from campaign videos with real metrics
      const platformTotals: Record<string, number> = { instagram: 0, tiktok: 0 };
      for (const vid of (campaignVideosData || [])) {
        const normalized = normalizeLink(vid.video_link);
        const metrics = metricsMap.get(normalized);
        if (metrics) {
          platformTotals[vid.platform] = (platformTotals[vid.platform] || 0) + metrics.views;
        }
      }
      setPlatformData(Object.entries(platformTotals).map(([platform, value]) => ({ platform, value })));

      // Fetch daily growth from external
      const dailyGrowth = await externalSupabase.getDailyGrowth(7);
      const formattedGrowth = dailyGrowth.map((day) => ({
        date: new Date(day.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        views: day.total_views,
      }));
      setViewsData(formattedGrowth);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateFilteredStats = () => {
    if (selectedCampaign === 'all') {
      setStats({
        totalCampaigns: allCampaigns.length,
        totalViews: allCampaigns.reduce((acc, c) => acc + c.total_views, 0),
        totalClippers: allCampaigns.reduce((acc, c) => acc + c.total_clippers, 0),
        pendingPayouts: pendingPayouts.length
      });
      setCampaigns(allCampaigns);
    } else {
      const filtered = allCampaigns.filter(c => c.id === selectedCampaign);
      setStats({
        totalCampaigns: 1,
        totalViews: filtered.reduce((acc, c) => acc + c.total_views, 0),
        totalClippers: filtered.reduce((acc, c) => acc + c.total_clippers, 0),
        pendingPayouts: pendingPayouts.length
      });
      setCampaigns(filtered);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Dashboard Admin
            </h1>
            <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[250px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">Todas as Campanhas</span>
                </SelectItem>
                {allCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${campaign.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                      {campaign.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => navigate('/admin/campaigns')} variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              Campanhas
            </Button>
            <Button onClick={() => navigate('/admin/create-campaign')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Total de Campanhas"
            value={stats.totalCampaigns}
            icon={Trophy}
            glowColor="purple"
          />
          <MetricCardGlow
            title="Total de Clipadores"
            value={formatNumber(stats.totalClippers)}
            icon={Users}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Total de Views"
            value={formatNumber(stats.totalViews)}
            icon={Eye}
            glowColor="green"
          />
          <MetricCardGlow
            title="Saques Pendentes"
            value={stats.pendingPayouts}
            icon={Wallet}
            glowColor="orange"
            subtitle={stats.pendingPayouts > 0 ? "Requer atenção" : undefined}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLineViews 
            data={viewsData} 
            title="Evolução de Views (7 dias)" 
          />
          <ChartPiePlatforms 
            data={platformData} 
            title="Distribuição por Plataforma" 
          />
        </div>

        {/* Tabs for Lists */}
        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="clippers">
              Clipadores Pendentes
              {pendingClippers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                  {pendingClippers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts">
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
                            {formatNumber(Number(campaign.total_views))} views • {campaign.total_posts} posts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">{campaign.total_clippers} clipadores</p>
                        <p className="text-xs text-muted-foreground">{campaign.engagement_rate}% engajamento</p>
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
