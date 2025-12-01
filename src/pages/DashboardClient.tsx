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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Eye, 
  Video,
  TrendingUp,
  Medal,
  DollarSign,
  RefreshCw,
  Calendar,
  Target,
  Sparkles,
  Crown,
  Flame
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
  image_url?: string;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [pendingClippers, setPendingClippers] = useState<any[]>([]);
  const [approvedClippers, setApprovedClippers] = useState<any[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [platformData, setPlatformData] = useState<{ platform: string; value: number }[]>([]);
  const [viewsData, setViewsData] = useState<{ date: string; views: number }[]>([]);

  useEffect(() => {
    if (user) {
      fetchOwnedCampaigns();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignData(selectedCampaign);
    }
  }, [selectedCampaign]);

  const fetchOwnedCampaigns = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: ownerData, error: ownerError } = await supabase
        .from('campaign_owners')
        .select('campaign_id')
        .eq('user_id', user.id);

      if (ownerError) {
        console.error('Erro ao buscar campaign_owners:', ownerError);
        toast.error('Erro ao verificar suas campanhas');
        setLoading(false);
        return;
      }

      if (ownerData && ownerData.length > 0) {
        const campaignIds = ownerData.map(o => o.campaign_id);
        
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('id, name, is_active, image_url')
          .in('id', campaignIds);

        if (campaignsData) {
          setCampaigns(campaignsData);
          if (campaignsData.length > 0) {
            setSelectedCampaign(campaignsData[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar suas campanhas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignData = async (campaignId: string) => {
    setRefreshing(true);
    try {
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
      } else {
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
        
        setSummary({
          total_views: totalViews,
          total_posts: videos?.length || 0,
          total_clippers: participants?.length || 0,
          engagement_rate: totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0
        });
      }

      const { data: pendingData } = await supabase
        .from('pending_campaign_participants')
        .select('*')
        .eq('campaign_id', campaignId);

      setPendingClippers(pendingData || []);

      const { data: approvedData } = await supabase
        .from('approved_campaign_participants')
        .select('*')
        .eq('campaign_id', campaignId);

      setApprovedClippers(approvedData || []);

      const { data: rankingData } = await supabase
        .from('ranking_views')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('rank_position', { ascending: true })
        .limit(10);

      setRanking(rankingData || []);

      const { data: platformDistData } = await supabase
        .from('campaign_platform_distribution')
        .select('*')
        .eq('campaign_id', campaignId);

      if (platformDistData && platformDistData.length > 0) {
        setPlatformData(platformDistData.map(p => ({
          platform: p.platform || 'Outros',
          value: Number(p.total_views || 0)
        })));
      } else {
        setPlatformData([]);
      }

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          views: Math.floor(Math.random() * 15000) + 5000
        };
      });
      setViewsData(last7Days);

    } catch (error) {
      console.error('Erro ao carregar dados da campanha:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (position === 3) return <Medal className="h-5 w-5 text-orange-400" />;
    return <Flame className="h-4 w-4 text-muted-foreground" />;
  };

  const getRankBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    if (position === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (position === 3) return 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30';
    return 'bg-muted/20 border-border/30';
  };

  if (loading) {
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

  if (campaigns.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="p-6 rounded-full bg-primary/10 mb-6">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nenhuma campanha vinculada
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Você ainda não é dono de nenhuma campanha. Entre em contato com um administrador para vincular campanhas à sua conta.
          </p>
          <Button onClick={() => navigate('/campaigns')} className="bg-gradient-to-r from-primary to-accent">
            <Target className="h-4 w-4 mr-2" />
            Ver Campanhas Disponíveis
          </Button>
        </div>
      </MainLayout>
    );
  }

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Dashboard Cliente
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o desempenho das suas campanhas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[280px] bg-card/50 border-border/50">
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
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => selectedCampaign && fetchCampaignData(selectedCampaign)}
              disabled={refreshing}
              className="border-border/50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {selectedCampaignData && (
          <GlowCard className="p-6 relative overflow-hidden">
            <div className="flex items-center gap-6">
              {selectedCampaignData.image_url ? (
                <img 
                  src={selectedCampaignData.image_url} 
                  alt={selectedCampaignData.name}
                  className="w-24 h-24 rounded-xl object-cover border-2 border-primary/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/30">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{selectedCampaignData.name}</h2>
                  <Badge className={selectedCampaignData.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400'}>
                    {selectedCampaignData.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Campanha em andamento
                </p>
              </div>
            </div>
          </GlowCard>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Total de Views"
            value={formatNumber(summary?.total_views || 0)}
            icon={Eye}
            glowColor="green"
          />
          <MetricCardGlow
            title="Total de Posts"
            value={summary?.total_posts || 0}
            icon={Video}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Clipadores"
            value={summary?.total_clippers || 0}
            icon={Users}
            glowColor="purple"
          />
          <MetricCardGlow
            title="Taxa de Engajamento"
            value={`${summary?.engagement_rate || 0}%`}
            icon={TrendingUp}
            glowColor="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLineViews 
            data={viewsData} 
            title="Evolução de Views (7 dias)" 
          />
          <ChartPiePlatforms 
            data={platformData.length > 0 ? platformData : [{ platform: 'Sem dados', value: 1 }]} 
            title="Distribuição por Plataforma" 
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 border border-border/30 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="clippers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Clipadores
              {pendingClippers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  {pendingClippers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ranking" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-400" />
                  Top 5 Clipadores
                </h3>
                <div className="space-y-3">
                  {ranking.slice(0, 5).map((item, index) => (
                    <div 
                      key={item.user_id} 
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] ${getRankBg(index + 1)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(index + 1)}
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-border/50">
                          <AvatarImage src={item.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {item.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{item.username}</span>
                      </div>
                      <span className="text-primary font-bold">{formatNumber(Number(item.total_views))} views</span>
                    </div>
                  ))}
                  {ranking.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Medal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum clipador no ranking ainda.</p>
                    </div>
                  )}
                </div>
              </GlowCard>

              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Resumo Financeiro
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <span className="text-muted-foreground">Ganhos estimados dos clipadores</span>
                    <span className="font-bold text-green-400">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Saques realizados</span>
                    <span className="font-semibold">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
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
                <GlowCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-400" />
                    Aguardando Aprovação
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {pendingClippers.length}
                    </Badge>
                  </h3>
                  <ClippersTable 
                    clippers={pendingClippers}
                    onRefresh={() => fetchCampaignData(selectedCampaign)}
                  />
                </GlowCard>
              )}

              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  Clipadores Aprovados
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {approvedClippers.length}
                  </Badge>
                </h3>
                {approvedClippers.length > 0 ? (
                  <ClippersTable 
                    clippers={approvedClippers}
                    showActions={false}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum clipador aprovado ainda.</p>
                  </div>
                )}
              </GlowCard>
            </div>
          </TabsContent>

          <TabsContent value="ranking">
            <GlowCard className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking Completo
              </h3>
              <div className="space-y-3">
                {ranking.map((item, index) => (
                  <div 
                    key={item.user_id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${getRankBg(index + 1)}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50">
                        {getRankIcon(index + 1)}
                      </div>
                      <Avatar className="h-12 w-12 border-2 border-border/50">
                        <AvatarImage src={item.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {item.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{item.username}</p>
                        <p className="text-sm text-muted-foreground">{item.total_videos} vídeos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{formatNumber(Number(item.total_views))}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Nenhum clipador no ranking ainda.</p>
                    <p className="text-sm">Os clipadores aparecerão aqui conforme enviarem vídeos.</p>
                  </div>
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