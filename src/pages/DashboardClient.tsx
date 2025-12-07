import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { ChartLineViews } from "@/components/Charts/ChartLineViews";
import { ChartPiePlatforms } from "@/components/Charts/ChartPiePlatforms";
import { ClippersTable } from "@/components/Tables/ClippersTable";
import { RankingWithPayment } from "@/components/Ranking/RankingWithPayment";
import { CampaignVideosTab } from "@/components/Campaign/CampaignVideosTab";
import { CampaignTypeBadge } from "@/components/Campaign/CampaignTypeBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useVideoMetricsHistory } from "@/hooks/useVideoMetricsHistory";
import { useCompetitionPrizes } from "@/hooks/useCompetitionPrizes";
import { SyncMetricsButton } from "@/components/Admin/SyncMetricsButton";
import { CampaignType } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Eye, 
  Video,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Calendar,
  Target,
  Sparkles,
  Crown,
  BarChart3,
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  Film
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EarningsBreakdownModal } from "@/components/Campaign/EarningsBreakdownModal";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

interface CampaignBasic {
  id: string;
  name: string;
  is_active: boolean;
  image_url?: string;
  campaign_type: CampaignType;
  payment_rate: number;
  platforms: string[];
  start_date: string;
  end_date: string;
}

function DashboardClientContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignBasic[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);

  const { 
    loading: campaignLoading, 
    refreshing, 
    campaign, 
    summary, 
    ranking, 
    platformData,
    pendingClippers,
    approvedClippers,
    refresh 
  } = useCampaignData(selectedCampaignId);

  const { prizes } = useCompetitionPrizes(selectedCampaignId);

  useEffect(() => {
    if (user) {
      fetchOwnedCampaigns();
    }
  }, [user]);

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
          .select('*')
          .in('id', campaignIds);

        if (campaignsData) {
          const mappedCampaigns: CampaignBasic[] = campaignsData.map(c => ({
            id: c.id,
            name: c.name,
            is_active: c.is_active,
            image_url: c.image_url || undefined,
            campaign_type: (c.campaign_type || 'pay_per_view') as CampaignType,
            payment_rate: Number(c.payment_rate || 0),
            platforms: c.platforms || [],
            start_date: c.start_date,
            end_date: c.end_date,
          }));
          setCampaigns(mappedCampaigns);
          if (mappedCampaigns.length > 0) {
            setSelectedCampaignId(mappedCampaigns[0].id);
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateTotalEarnings = () => {
    if (!campaign || !summary) return 0;
    if (campaign.campaign_type === 'pay_per_view') {
      return (summary.total_views / 1000) * campaign.payment_rate;
    }
    return campaign.prize_pool || 0;
  };

  // Using real metrics from hook
  const { data: metricsHistory } = useVideoMetricsHistory(selectedCampaignId, 7);
  
  const viewsData = metricsHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    views: item.views
  }));

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
          <div className="p-6 rounded-full bg-primary/10 mb-6 animate-pulse-glow">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-glow">
            Nenhuma campanha vinculada
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Você ainda não é dono de nenhuma campanha. Entre em contato com um administrador para vincular campanhas à sua conta.
          </p>
          <Button onClick={() => navigate('/campaigns')} className="premium-gradient">
            <Target className="h-4 w-4 mr-2" />
            Ver Campanhas Disponíveis
          </Button>
        </div>
      </MainLayout>
    );
  }

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-glow">
              Dashboard Cliente
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o desempenho das suas campanhas em tempo real
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[280px] glass-card border-border/50">
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refresh()}
              disabled={refreshing}
              className="hover-glow"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              onClick={() => setEarningsModalOpen(true)}
              className="hover-glow"
              disabled={!selectedCampaign}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Detalhes
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hover-glow" disabled={!selectedCampaign || !summary}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedCampaign && summary) {
                      exportToCSV({
                        campaign: {
                          name: selectedCampaign.name,
                          campaign_type: selectedCampaign.campaign_type,
                          payment_rate: selectedCampaign.payment_rate,
                          prize_pool: campaign?.prize_pool || 0,
                          start_date: selectedCampaign.start_date,
                          end_date: selectedCampaign.end_date,
                          platforms: selectedCampaign.platforms,
                        },
                        summary,
                        ranking,
                      }, selectedCampaign.name.toLowerCase().replace(/\s+/g, '-'));
                      toast.success('Relatório CSV exportado com sucesso!');
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedCampaign && summary) {
                      exportToPDF({
                        campaign: {
                          name: selectedCampaign.name,
                          campaign_type: selectedCampaign.campaign_type,
                          payment_rate: selectedCampaign.payment_rate,
                          prize_pool: campaign?.prize_pool || 0,
                          start_date: selectedCampaign.start_date,
                          end_date: selectedCampaign.end_date,
                          platforms: selectedCampaign.platforms,
                        },
                        summary,
                        ranking,
                      }, selectedCampaign.name.toLowerCase().replace(/\s+/g, '-'));
                      toast.success('Relatório PDF gerado com sucesso!');
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Campaign Info Card */}
        {selectedCampaign && (
          <GlowCard className="p-6 relative overflow-hidden" glowColor="primary">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {selectedCampaign.image_url ? (
                <img 
                  src={selectedCampaign.image_url} 
                  alt={selectedCampaign.name}
                  className="w-28 h-28 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/30">
                  <Trophy className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                  <Badge className={selectedCampaign.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400'}>
                    {selectedCampaign.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <CampaignTypeBadge type={selectedCampaign.campaign_type} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedCampaign.start_date).toLocaleDateString('pt-BR')} - {new Date(selectedCampaign.end_date).toLocaleDateString('pt-BR')}
                  </span>
                  {selectedCampaign.campaign_type === 'pay_per_view' && (
                    <span className="flex items-center gap-1 text-green-400">
                      <DollarSign className="h-4 w-4" />
                      R$ {selectedCampaign.payment_rate.toFixed(2)}/1K views
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaign.platforms?.map((platform) => (
                    <Badge key={platform} variant="outline" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </GlowCard>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Total de Views"
            value={formatNumber(summary?.total_views || 0)}
            icon={Eye}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Total de Vídeos"
            value={summary?.total_posts || 0}
            icon={Video}
            glowColor="purple"
          />
          <MetricCardGlow
            title="Clipadores"
            value={summary?.total_clippers || 0}
            icon={Users}
            glowColor="orange"
          />
          <MetricCardGlow
            title="Ganhos Estimados"
            value={formatCurrency(calculateTotalEarnings())}
            icon={DollarSign}
            glowColor="green"
          />
        </div>

        {/* Charts */}
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

        {/* Tabs */}
        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="glass-card p-1 border border-border/30">
            <TabsTrigger value="ranking" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Crown className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Film className="h-4 w-4 mr-2" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="clippers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="h-4 w-4 mr-2" />
              Clipadores
              {pendingClippers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  {pendingClippers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <GlowCard className="p-6">
              {selectedCampaign && (
                <RankingWithPayment
                  ranking={ranking}
                  campaignId={selectedCampaignId}
                  campaignType={selectedCampaign.campaign_type}
                  paymentRate={selectedCampaign.payment_rate}
                  minViews={campaign?.min_views || 0}
                  maxPaidViews={campaign?.max_paid_views || Infinity}
                  prizes={prizes}
                  onPaymentComplete={refresh}
                  title="Ranking com Pagamentos"
                  showPaymentActions={true}
                />
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="videos">
            <GlowCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Vídeos da Campanha
              </h3>
              {selectedCampaignId && (
                <CampaignVideosTab campaignId={selectedCampaignId} />
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="clippers">
            <div className="space-y-6">
              {pendingClippers.length > 0 && (
                <GlowCard className="p-6" glowColor="orange">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-400" />
                    Aguardando Aprovação
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {pendingClippers.length}
                    </Badge>
                  </h3>
                  <ClippersTable 
                    clippers={pendingClippers}
                    onRefresh={refresh}
                  />
                </GlowCard>
              )}

              <GlowCard className="p-6" glowColor="green">
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

          <TabsContent value="stats">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Engajamento
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Taxa de Engajamento</span>
                    <span className="font-bold text-primary">{summary?.engagement_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Total de Likes</span>
                    <span className="font-semibold">{formatNumber(summary?.total_likes || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Total de Comentários</span>
                    <span className="font-semibold">{formatNumber(summary?.total_comments || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Total de Compartilhamentos</span>
                    <span className="font-semibold">{formatNumber(summary?.total_shares || 0)}</span>
                  </div>
                </div>
              </GlowCard>

              <GlowCard className="p-6" glowColor="green">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Resumo Financeiro
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <span className="text-muted-foreground">Ganhos estimados dos clipadores</span>
                    <span className="font-bold text-green-400">{formatCurrency(calculateTotalEarnings())}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Média por vídeo</span>
                    <span className="font-semibold">
                      {formatCurrency(summary?.total_posts ? calculateTotalEarnings() / summary.total_posts : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Média por clipador</span>
                    <span className="font-semibold">
                      {formatCurrency(summary?.total_clippers ? calculateTotalEarnings() / summary.total_clippers : 0)}
                    </span>
                  </div>
                  {selectedCampaign?.campaign_type === 'pay_per_view' && (
                    <div className="flex justify-between items-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-muted-foreground">Taxa por 1K views</span>
                      <span className="font-bold text-primary">R$ {selectedCampaign.payment_rate.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>
          </TabsContent>
        </Tabs>

        {/* Earnings Breakdown Modal */}
        {selectedCampaign && (
          <EarningsBreakdownModal
            open={earningsModalOpen}
            onOpenChange={setEarningsModalOpen}
            campaignType={selectedCampaign.campaign_type}
            paymentRate={selectedCampaign.payment_rate}
            prizePool={campaign?.prize_pool || 0}
            ranking={ranking}
          />
        )}
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
