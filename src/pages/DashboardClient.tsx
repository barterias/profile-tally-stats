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
import { useLanguage } from "@/contexts/LanguageContext";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useVideoMetricsHistory } from "@/hooks/useVideoMetricsHistory";
import { useCompetitionPrizes } from "@/hooks/useCompetitionPrizes";
import { useCampaignPayments } from "@/hooks/useCampaignPayments";
import { useSocialMetrics } from "@/hooks/useSocialMetrics";
import { PaymentTable } from "@/components/Payments/PaymentTable";
import { PaymentSummaryCard } from "@/components/Payments/PaymentSummaryCard";
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
  Film,
  Wallet
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
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignBasic[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [rankingTab, setRankingTab] = useState<'all' | 'daily' | 'monthly' | 'perView'>('all');

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
  const { data: socialMetrics } = useSocialMetrics();

  const { 
    clippers: paymentClippers, 
    loading: paymentsLoading, 
    totalPending, 
    totalPaid,
    processPayment,
    refetch: refetchPayments
  } = useCampaignPayments(selectedCampaignId, 'monthly', new Date());

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
        console.error('Error fetching campaign_owners:', ownerError);
        toast.error(t('error'));
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
      console.error('Error loading campaigns:', error);
      toast.error(t('error'));
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
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
      style: 'currency', 
      currency: language === 'pt' ? 'BRL' : 'USD' 
    }).format(value);
  };

  const calculateTotalEarnings = () => {
    if (!campaign || !summary) return 0;
    if (campaign.campaign_type === 'pay_per_view') {
      return (summary.total_views / 1000) * campaign.payment_rate;
    }
    return campaign.prize_pool || 0;
  };

  const { data: metricsHistory } = useVideoMetricsHistory(selectedCampaignId, 7);
  
  const viewsData = metricsHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' }),
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
            <p className="text-muted-foreground">{t('loadingDashboard')}</p>
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
            {t('noCampaignsLinked')}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('noCampaignsDescription')}
          </p>
          <Button onClick={() => navigate('/campaigns')} className="premium-gradient">
            <Target className="h-4 w-4 mr-2" />
            {t('viewAvailableCampaigns')}
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
              {t('clientDashboard')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('trackPerformance')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[280px] glass-card border-border/50">
                <SelectValue placeholder={t('selectCampaign')} />
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
              {t('details')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hover-glow" disabled={!selectedCampaign || !summary}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
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
                      toast.success(t('success'));
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {t('exportCSV')}
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
                      toast.success(t('success'));
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('exportPDF')}
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
                    {selectedCampaign.is_active ? t('active') : t('inactive')}
                  </Badge>
                  <CampaignTypeBadge type={selectedCampaign.campaign_type} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedCampaign.start_date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')} - {new Date(selectedCampaign.end_date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                  </span>
                  {selectedCampaign.campaign_type === 'pay_per_view' && (
                    <span className="flex items-center gap-1 text-green-400">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(selectedCampaign.payment_rate)}/1K views
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
            title={t('totalViews')}
            value={formatNumber(summary?.total_views || 0)}
            icon={Eye}
            glowColor="blue"
          />
          <MetricCardGlow
            title={t('totalVideos')}
            value={summary?.total_posts || 0}
            icon={Video}
            glowColor="purple"
          />
          <MetricCardGlow
            title={t('clippers')}
            value={summary?.total_clippers || 0}
            icon={Users}
            glowColor="orange"
          />
          <MetricCardGlow
            title={t('estimatedEarnings')}
            value={formatCurrency(calculateTotalEarnings())}
            icon={DollarSign}
            glowColor="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLineViews 
            data={viewsData.length > 0 ? viewsData : [{ date: new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' }), views: 0 }]} 
            title={`${t('viewsEvolution')} (${t('last7Days')})`}
          />
          <ChartPiePlatforms 
            data={platformData.length > 0 ? platformData : [{ platform: t('noData'), value: 1 }]} 
            title={t('platformDistribution')}
          />
        </div>

        {/* Social Media Overview - Only show if has accounts */}
        {socialMetrics && socialMetrics.accountsCount.total > 0 && (
          <GlowCard className="p-6" glowColor="blue">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('socialMediaOverview')}</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/account-analytics')}>
                {t('viewDetails')}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <p className="text-2xl font-bold">{formatNumber(socialMetrics.totalFollowers)}</p>
                <p className="text-xs text-muted-foreground">{t('followers')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <p className="text-2xl font-bold">{formatNumber(socialMetrics.totalViews)}</p>
                <p className="text-xs text-muted-foreground">{t('views')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <p className="text-2xl font-bold">{formatNumber(socialMetrics.totalLikes)}</p>
                <p className="text-xs text-muted-foreground">{t('likes')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <p className="text-2xl font-bold">{socialMetrics.accountsCount.total}</p>
                <p className="text-xs text-muted-foreground">{t('accounts')}</p>
              </div>
            </div>
          </GlowCard>
        )}

        {/* Tabs */}
        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="glass-card p-1 border border-border/30">
            <TabsTrigger value="ranking" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Crown className="h-4 w-4 mr-2" />
              {t('ranking')}
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Film className="h-4 w-4 mr-2" />
              {t('videos')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('statistics')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Wallet className="h-4 w-4 mr-2" />
              {t('payments')}
              {totalPending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  {t('pending')}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <GlowCard className="p-6">
              {/* Ranking Sub-tabs */}
              <div className="mb-6">
                <Tabs value={rankingTab} onValueChange={(v) => setRankingTab(v as any)}>
                  <TabsList className="bg-muted/30">
                    <TabsTrigger value="all">{t('allRankings')}</TabsTrigger>
                    <TabsTrigger value="perView">{t('perViewRanking')}</TabsTrigger>
                    <TabsTrigger value="daily">{t('dailyRanking')}</TabsTrigger>
                    <TabsTrigger value="monthly">{t('monthlyRanking')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
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
                  title={t('rankingWithPayments')}
                  showPaymentActions={true}
                />
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="videos">
            <GlowCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                {t('campaignVideos')}
              </h3>
              {selectedCampaignId && (
                <CampaignVideosTab campaignId={selectedCampaignId} />
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('engagement')}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('engagementRate')}</span>
                    <span className="font-bold text-primary">{summary?.engagement_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('totalLikes')}</span>
                    <span className="font-semibold">{formatNumber(summary?.total_likes || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('totalComments')}</span>
                    <span className="font-semibold">{formatNumber(summary?.total_comments || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('totalShares')}</span>
                    <span className="font-semibold">{formatNumber(summary?.total_shares || 0)}</span>
                  </div>
                </div>
              </GlowCard>

              <GlowCard className="p-6" glowColor="green">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  {t('financialSummary')}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <span className="text-muted-foreground">{t('clipperEstimatedEarnings')}</span>
                    <span className="font-bold text-green-400">{formatCurrency(calculateTotalEarnings())}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('averagePerVideo')}</span>
                    <span className="font-semibold">
                      {formatCurrency(summary?.total_posts ? calculateTotalEarnings() / summary.total_posts : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">{t('averagePerClipper')}</span>
                    <span className="font-semibold">
                      {formatCurrency(summary?.total_clippers ? calculateTotalEarnings() / summary.total_clippers : 0)}
                    </span>
                  </div>
                  {selectedCampaign?.campaign_type === 'pay_per_view' && (
                    <div className="flex justify-between items-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-muted-foreground">{t('ratePer1kViews')}</span>
                      <span className="font-bold text-primary">{formatCurrency(selectedCampaign.payment_rate)}</span>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              <PaymentSummaryCard
                totalPending={totalPending}
                totalPaid={totalPaid}
                totalClippers={paymentClippers.length}
                paidClippers={paymentClippers.filter(c => c.payment_status === 'paid').length}
              />
              
              <GlowCard className="p-6" glowColor="green">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-400" />
                  {t('paymentsThisMonth')}
                </h3>
                <PaymentTable
                  clippers={paymentClippers}
                  onPayment={async (userId, amount, notes) => {
                    const result = await processPayment(userId, amount, notes);
                    if (result.success) {
                      refresh();
                    }
                    return result;
                  }}
                  loading={paymentsLoading}
                />
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