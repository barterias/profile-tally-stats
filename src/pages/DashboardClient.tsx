import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { ChartLineViews } from "@/components/Charts/ChartLineViews";
import { ChartPiePlatforms } from "@/components/Charts/ChartPiePlatforms";
import { ClippersTable } from "@/components/Tables/ClippersTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trophy, 
  Users, 
  Eye, 
  Video,
  TrendingUp,
  Medal,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

interface CampaignSummary {
  total_views: number;
  total_posts: number;
  total_clippers: number;
  engagement_rate: number;
}

interface RankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_videos: number;
  total_views: number;
  rank_position: number;
}

function DashboardClientContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [pendingClippers, setPendingClippers] = useState<any[]>([]);
  const [approvedClippers, setApprovedClippers] = useState<any[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [platformData, setPlatformData] = useState<{ platform: string; value: number }[]>([]);
  const [viewsData, setViewsData] = useState<{ date: string; views: number }[]>([]);

  useEffect(() => {
    if (user && !authLoading) {
      console.log('DashboardClient: Fetching campaigns for user:', user.id);
      fetchOwnedCampaigns();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignData(selectedCampaign);
    }
  }, [selectedCampaign]);

  const fetchOwnedCampaigns = async () => {
    if (!user?.id) {
      console.log('DashboardClient: No user ID available');
      setLoading(false);
      return;
    }
    
    try {
      console.log('DashboardClient: Querying campaign_owners for user_id:', user.id);
      
      const { data: ownerData, error: ownerError } = await supabase
        .from('campaign_owners')
        .select('campaign_id')
        .eq('user_id', user.id);

      console.log('DashboardClient: campaign_owners result:', { ownerData, ownerError });

      if (ownerError) {
        console.error('Erro ao buscar campaign_owners:', ownerError);
        toast.error('Erro ao verificar suas campanhas');
        setLoading(false);
        return;
      }

      if (ownerData && ownerData.length > 0) {
        const campaignIds = ownerData.map(o => o.campaign_id);
        console.log('DashboardClient: Campaign IDs found:', campaignIds);
        
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name, is_active')
          .in('id', campaignIds);

        console.log('DashboardClient: campaigns result:', { campaignsData, campaignsError });

        if (campaignsData) {
          setCampaigns(campaignsData);
          if (campaignsData.length > 0) {
            setSelectedCampaign(campaignsData[0].id);
          }
        }
      } else {
        console.log('DashboardClient: No campaign_owners found for this user');
      }
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar suas campanhas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignData = async (campaignId: string) => {
    try {
      // Fetch campaign summary
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
          engagement_rate: Number(summaryData.engagement_rate || 0)
        });
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

      // Fetch ranking
      const { data: rankingData } = await supabase
        .from('ranking_views')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('rank_position', { ascending: true })
        .limit(10);

      setRanking(rankingData || []);

      // Fetch platform distribution
      const { data: platformDistData } = await supabase
        .from('campaign_platform_distribution')
        .select('*')
        .eq('campaign_id', campaignId);

      if (platformDistData) {
        setPlatformData(platformDistData.map(p => ({
          platform: p.platform,
          value: Number(p.total_views || 0)
        })));
      }

      // Generate mock views data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          views: Math.floor(Math.random() * 20000) + 5000
        };
      });
      setViewsData(last7Days);

    } catch (error) {
      console.error('Erro ao carregar dados da campanha:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (campaigns.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma campanha vinculada</h2>
          <p className="text-muted-foreground mb-4">
            Você não é dono de nenhuma campanha ainda.
          </p>
          <Button onClick={() => navigate('/campaigns')}>
            Ver Campanhas Disponíveis
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Dashboard Cliente
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie suas campanhas</p>
          </div>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${campaign.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {campaign.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCardGlow
              title="Total de Views"
              value={formatNumber(summary.total_views)}
              icon={Eye}
              glowColor="green"
            />
            <MetricCardGlow
              title="Total de Posts"
              value={summary.total_posts}
              icon={Video}
              glowColor="blue"
            />
            <MetricCardGlow
              title="Clipadores"
              value={summary.total_clippers}
              icon={Users}
              glowColor="purple"
            />
            <MetricCardGlow
              title="Taxa de Engajamento"
              value={`${summary.engagement_rate}%`}
              icon={TrendingUp}
              glowColor="orange"
            />
          </div>
        )}

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

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="clippers">
              Clipadores
              {pendingClippers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                  {pendingClippers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Medal className="h-5 w-5 text-yellow-400" />
                  Top 5 Clipadores
                </h3>
                <div className="space-y-3">
                  {ranking.slice(0, 5).map((item, index) => (
                    <div key={item.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-300' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{item.username}</span>
                      </div>
                      <span className="text-primary font-semibold">{formatNumber(Number(item.total_views))} views</span>
                    </div>
                  ))}
                  {ranking.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Nenhum clipador no ranking ainda.</p>
                  )}
                </div>
              </GlowCard>

              <GlowCard>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Resumo Financeiro
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                    <span className="text-muted-foreground">Ganhos estimados dos clipadores</span>
                    <span className="font-semibold">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                    <span className="text-muted-foreground">Saques realizados</span>
                    <span className="font-semibold">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                    <span className="text-muted-foreground">Saques pendentes</span>
                    <span className="font-semibold text-yellow-400">R$ 0,00</span>
                  </div>
                </div>
              </GlowCard>
            </div>
          </TabsContent>

          <TabsContent value="clippers">
            <div className="space-y-6">
              {pendingClippers.length > 0 && (
                <GlowCard>
                  <h3 className="text-lg font-semibold mb-4">Aguardando Aprovação ({pendingClippers.length})</h3>
                  <ClippersTable 
                    clippers={pendingClippers}
                    onRefresh={() => fetchCampaignData(selectedCampaign)}
                  />
                </GlowCard>
              )}

              <GlowCard>
                <h3 className="text-lg font-semibold mb-4">Clipadores Aprovados ({approvedClippers.length})</h3>
                <ClippersTable 
                  clippers={approvedClippers}
                  showActions={false}
                />
              </GlowCard>
            </div>
          </TabsContent>

          <TabsContent value="ranking">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Ranking Completo</h3>
              <div className="space-y-2">
                {ranking.map((item, index) => (
                  <div key={item.user_id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.username}</p>
                        <p className="text-sm text-muted-foreground">{item.total_videos} vídeos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{formatNumber(Number(item.total_views))}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum clipador no ranking ainda.</p>
                )}
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
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
