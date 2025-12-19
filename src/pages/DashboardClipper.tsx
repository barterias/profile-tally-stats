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
  Medal,
  Plus,
  Loader2,
  TrendingUp,
  Crown,
  Flame,
  Target,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

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

function DashboardClipperContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [stats, setStats] = useState({ totalViews: 0, totalVideos: 0, ranking: 0, estimatedEarnings: 0 });
  const [userRanking, setUserRanking] = useState<RankingItem[]>([]);

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
            <p className="text-muted-foreground mt-1">Acompanhe seu progresso</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/account-analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Métricas
            </Button>
            <Button onClick={() => navigate('/campaigns')}>
              <Trophy className="h-4 w-4 mr-2" />
              Campanhas
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            title="Campanhas Ativas"
            value={participations.filter(p => p.status === 'approved').length}
            icon={Trophy}
            glowColor="orange"
          />
        </div>

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
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{campaign.name}</p>
                          <CampaignTypeBadge type={campaign.campaign_type} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {campaign.description || 'Sem descrição'}
                        </p>
                        {campaign.campaign_type === 'pay_per_view' && campaign.payment_rate > 0 && (
                          <p className="text-xs text-green-400 mt-1">
                            R$ {campaign.payment_rate.toFixed(2)} / 1K views
                          </p>
                        )}
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
