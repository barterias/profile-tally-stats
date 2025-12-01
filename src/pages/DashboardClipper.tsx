import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { GlowCard } from "@/components/ui/GlowCard";
import { MetricCardGlow } from "@/components/ui/MetricCardGlow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RankingList } from "@/components/Ranking/RankingList";
import { CampaignTypeBadge } from "@/components/Campaign/CampaignTypeBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CampaignType, RankingItem } from "@/types/campaign";
import { 
  Trophy, 
  Eye, 
  Video,
  Wallet,
  Medal,
  Plus,
  Send,
  Loader2,
  TrendingUp,
  Crown,
  Flame,
  DollarSign,
  Target
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  description: string;
  is_active: boolean;
  platforms: string[];
  campaign_type: CampaignType;
  payment_rate: number;
  prize_description?: string;
  user_status?: string;
}

interface Participation {
  id: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  applied_at: string;
}

interface VideoSubmission {
  id: string;
  campaign_id: string;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  verified: boolean;
  submitted_at: string;
}

interface WalletData {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

function DashboardClipperContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [stats, setStats] = useState({ totalViews: 0, totalVideos: 0, ranking: 0, estimatedEarnings: 0 });
  const [userRanking, setUserRanking] = useState<RankingItem[]>([]);
  
  // Dialogs
  const [payoutDialog, setPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true);

      // Fetch user participations
      const { data: participationsData } = await supabase
        .from('campaign_participants')
        .select(`
          id,
          campaign_id,
          status,
          applied_at,
          campaigns:campaign_id (name, campaign_type, payment_rate)
        `)
        .eq('user_id', user?.id);

      const participationMap = new Map(
        (participationsData || []).map(p => [p.campaign_id, p])
      );

      // Mark campaigns with user status
      const campaignsWithStatus = (campaignsData || []).map(c => ({
        ...c,
        campaign_type: (c.campaign_type || 'pay_per_view') as CampaignType,
        payment_rate: Number(c.payment_rate || 0),
        user_status: participationMap.get(c.id)?.status || 'available'
      }));

      setAvailableCampaigns(campaignsWithStatus.filter(c => c.user_status === 'available'));
      setParticipations((participationsData || []).map(p => ({
        id: p.id,
        campaign_id: p.campaign_id,
        campaign_name: (p.campaigns as any)?.name || 'Campanha',
        status: p.status,
        applied_at: p.applied_at
      })));

      // Fetch user submissions
      const { data: submissionsData } = await supabase
        .from('campaign_videos')
        .select('*, campaigns:campaign_id (campaign_type, payment_rate)')
        .eq('submitted_by', user?.id)
        .order('submitted_at', { ascending: false });

      setSubmissions(submissionsData || []);

      // Calculate stats with estimated earnings
      const totalViews = (submissionsData || []).reduce((acc, s) => acc + Number(s.views || 0), 0);
      const totalVideos = (submissionsData || []).length;
      
      // Calculate estimated earnings based on campaign payment rates
      let estimatedEarnings = 0;
      (submissionsData || []).forEach((video: any) => {
        if (video.campaigns?.campaign_type === 'pay_per_view') {
          estimatedEarnings += (Number(video.views || 0) / 1000) * Number(video.campaigns.payment_rate || 0);
        }
      });

      setStats({ totalViews, totalVideos, ranking: 0, estimatedEarnings });

      // Fetch user's ranking position in each campaign
      const { data: rankingData } = await supabase
        .from('ranking_views')
        .select('*')
        .eq('user_id', user?.id);

      if (rankingData) {
        setUserRanking(rankingData.map(r => ({
          user_id: r.user_id || '',
          username: r.username || '',
          avatar_url: r.avatar_url,
          total_videos: Number(r.total_videos || 0),
          total_views: Number(r.total_views || 0),
          rank_position: Number(r.rank_position || 0),
        })));
      }

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (walletData) {
        setWallet({
          available_balance: Number(walletData.available_balance || 0),
          pending_balance: Number(walletData.pending_balance || 0),
          total_earned: Number(walletData.total_earned || 0),
          total_withdrawn: Number(walletData.total_withdrawn || 0)
        });
      } else {
        setWallet({
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestParticipation = async (campaignId: string) => {
    try {
      const { error } = await supabase.rpc('request_campaign_participation', { 
        p_campaign_id: campaignId 
      });
      if (error) throw error;
      toast.success('Solicitação enviada! Aguarde aprovação.');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao solicitar: ' + error.message);
    }
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || !pixKey || !pixType) {
      toast.error('Preencha todos os campos');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (amount <= 0 || amount > (wallet?.available_balance || 0)) {
      toast.error('Valor inválido');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('request_payout', {
        p_amount: amount,
        p_pix_key: pixKey,
        p_pix_type: pixType
      });
      if (error) throw error;
      toast.success('Saque solicitado com sucesso!');
      setPayoutDialog(false);
      setPayoutAmount('');
      setPixKey('');
      setPixType('');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao solicitar saque: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Dashboard Clipador
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhe seu progresso e ganhos</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/submit')}>
              <Video className="h-4 w-4 mr-2" />
              Enviar Vídeo
            </Button>
            <Button onClick={() => setPayoutDialog(true)} disabled={!wallet || wallet.available_balance <= 0}>
              <Wallet className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Saldo Disponível"
            value={formatCurrency(wallet?.available_balance || 0)}
            icon={Wallet}
            glowColor="green"
          />
          <MetricCardGlow
            title="Total de Views"
            value={formatNumber(stats.totalViews)}
            icon={Eye}
            glowColor="blue"
          />
          <MetricCardGlow
            title="Vídeos Enviados"
            value={stats.totalVideos}
            icon={Video}
            glowColor="purple"
          />
          <MetricCardGlow
            title="Ganhos Totais"
            value={formatCurrency(wallet?.total_earned || 0)}
            icon={TrendingUp}
            glowColor="orange"
          />
        </div>

        {/* Wallet Card */}
        <GlowCard glowColor="green">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Minha Carteira</h3>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(wallet?.available_balance || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pendente: {formatCurrency(wallet?.pending_balance || 0)} • 
                Sacado: {formatCurrency(wallet?.total_withdrawn || 0)}
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={() => setPayoutDialog(true)}
              disabled={!wallet || wallet.available_balance <= 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>
        </GlowCard>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="participations">Minhas Participações</TabsTrigger>
            <TabsTrigger value="videos">Meus Vídeos</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Campanhas Disponíveis</h3>
              {availableCampaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha disponível no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableCampaigns.map((campaign) => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {campaign.description || 'Sem descrição'}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {campaign.platforms?.map((platform) => (
                            <span key={platform} className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button onClick={() => handleRequestParticipation(campaign.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Participar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="participations">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Minhas Participações</h3>
              {participations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Você ainda não participa de nenhuma campanha.
                </p>
              ) : (
                <div className="space-y-3">
                  {participations.map((p) => (
                    <div 
                      key={p.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20"
                    >
                      <div>
                        <p className="font-medium">{p.campaign_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Solicitado em {new Date(p.applied_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </TabsContent>

          <TabsContent value="videos">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-4">Meus Vídeos Enviados</h3>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Você ainda não enviou nenhum vídeo.</p>
                  <Button className="mt-4" onClick={() => navigate('/submit')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Enviar Primeiro Vídeo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((video) => (
                    <div 
                      key={video.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary uppercase">
                            {video.platform}
                          </span>
                          <StatusBadge status={video.verified ? 'approved' : 'pending'} />
                        </div>
                        <a 
                          href={video.video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary truncate block max-w-md mt-1"
                        >
                          {video.video_link}
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNumber(video.views || 0)} views</p>
                        <p className="text-xs text-muted-foreground">{video.likes || 0} likes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payout Dialog */}
      <Dialog open={payoutDialog} onOpenChange={setPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>
              Saldo disponível: {formatCurrency(wallet?.available_balance || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor do saque</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                max={wallet?.available_balance || 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de chave PIX</Label>
              <Select value={pixType} onValueChange={setPixType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Chave aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                placeholder="Digite sua chave PIX"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayoutDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestPayout} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Solicitar Saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function DashboardClipper() {
  return (
    <ProtectedRoute>
      <DashboardClipperContent />
    </ProtectedRoute>
  );
}
