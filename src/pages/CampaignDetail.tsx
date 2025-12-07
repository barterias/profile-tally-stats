import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase, n8nWebhook } from "@/lib/externalSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlowCard } from "@/components/ui/GlowCard";
import MainLayout from "@/components/Layout/MainLayout";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Award,
  Users,
  Video,
  TrendingUp,
  Send,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Instagram,
  Music,
  Youtube,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  rules: string;
  is_active: boolean;
}

interface CampaignVideo {
  id: string;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  submitted_at: string;
  submitted_by: string;
  verified: boolean;
  username?: string;
}

type ParticipationStatus = 'none' | 'requested' | 'approved' | 'rejected';

function CampaignDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus>('none');
  const [requestingParticipation, setRequestingParticipation] = useState(false);

  useEffect(() => {
    fetchCampaignData();
    if (user) {
      checkParticipationStatus();
    }
  }, [id, user]);

  const checkParticipationStatus = async () => {
    if (!user || !id) return;
    
    try {
      const { data } = await supabase
        .from('campaign_participants')
        .select('status')
        .eq('campaign_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setParticipationStatus(data.status as ParticipationStatus);
      }
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

  const handleRequestParticipation = async () => {
    if (!user || !id) return;
    
    setRequestingParticipation(true);
    try {
      const { error } = await supabase.rpc('request_campaign_participation', {
        p_campaign_id: id
      });

      if (error) throw error;

      setParticipationStatus('requested');
      toast({
        title: "Solicitação enviada!",
        description: "Aguarde a aprovação do administrador.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar participação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequestingParticipation(false);
    }
  };

  const fetchCampaignData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: videosData, error: videosError } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", id);

      if (videosError) throw videosError;

      // Buscar usernames dos participantes
      const userIds = [...new Set(videosData?.map(v => v.submitted_by).filter(Boolean))];
      let usernamesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (profiles) {
          usernamesMap = Object.fromEntries(profiles.map(p => [p.id, p.username]));
        }
      }

      if (videosData && videosData.length > 0) {
        const [allInstagramVideos, allTikTokVideos] = await Promise.all([
          externalSupabase.getAllVideos(),
          externalSupabase.getSocialVideos(),
        ]);

        const normalizeLink = (link: string): string => {
          if (!link) return '';
          return link
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .trim();
        };

        const extractVideoId = (link: string): string | null => {
          if (!link) return null;
          const instaMatch = link.match(/\/(reels?|p)\/([A-Za-z0-9_-]+)/);
          if (instaMatch) return instaMatch[2];
          const tiktokMatch = link.match(/\/video\/(\d+)/);
          if (tiktokMatch) return tiktokMatch[1];
          return null;
        };

        const videosWithMetrics = await Promise.all(
          videosData.map(async (video) => {
            const normalizedCampaignLink = normalizeLink(video.video_link);
            let metrics = { views: 0, likes: 0, comments: 0, shares: 0 };
            
            try {
              if (video.platform === "instagram") {
                const match = allInstagramVideos?.find(v => {
                  const dbLink = normalizeLink(v.link || v.video_url || '');
                  return dbLink === normalizedCampaignLink || 
                         dbLink.includes(normalizedCampaignLink) || 
                         normalizedCampaignLink.includes(dbLink);
                });

                if (match) {
                  metrics = {
                    views: match.views || 0,
                    likes: match.likes || 0,
                    comments: match.comments || 0,
                    shares: match.shares || 0,
                  };
                } else {
                  const videoId = extractVideoId(video.video_link);
                  if (videoId) {
                    const matchById = allInstagramVideos?.find(v => {
                      const dbId = extractVideoId(v.link || v.video_url || '');
                      return dbId === videoId;
                    });
                    if (matchById) {
                      metrics = {
                        views: matchById.views || 0,
                        likes: matchById.likes || 0,
                        comments: matchById.comments || 0,
                        shares: matchById.shares || 0,
                      };
                    }
                  }
                }
              } else if (video.platform === "tiktok") {
                const videoId = extractVideoId(video.video_link);
                
                if (videoId) {
                  const matchById = allTikTokVideos?.find(v => 
                    v.video_id === videoId || v.video_id === `=${videoId}`
                  );
                  if (matchById) {
                    metrics = {
                      views: matchById.views || 0,
                      likes: matchById.likes || 0,
                      comments: matchById.comments || 0,
                      shares: matchById.shares || 0,
                    };
                  }
                }

                if (metrics.views === 0) {
                  const match = allTikTokVideos?.find(v => {
                    const dbLink = normalizeLink(v.link || v.video_url || '');
                    return dbLink === normalizedCampaignLink || 
                           dbLink.includes(normalizedCampaignLink) || 
                           normalizedCampaignLink.includes(dbLink);
                  });
                  if (match) {
                    metrics = {
                      views: match.views || 0,
                      likes: match.likes || 0,
                      comments: match.comments || 0,
                      shares: match.shares || 0,
                    };
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing video:`, error);
            }
            
            return {
              ...video,
              ...metrics,
              username: usernamesMap[video.submitted_by] || `Participante #${video.id.slice(0, 4)}`,
            };
          })
        );

        const sortedVideos = videosWithMetrics.sort((a, b) => (b.views || 0) - (a.views || 0));
        setVideos(sortedVideos);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast({
        title: "Erro ao carregar campanha",
        description: "Não foi possível carregar os dados da campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (participationStatus !== 'approved' && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você precisa ser um participante aprovado para enviar vídeos.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let detectedPlatform = "instagram";
      if (videoLink.includes("instagram.com")) {
        detectedPlatform = "instagram";
      } else if (videoLink.includes("tiktok.com")) {
        detectedPlatform = "tiktok";
      } else if (videoLink.includes("youtube.com") || videoLink.includes("youtu.be")) {
        detectedPlatform = "youtube";
      } else {
        throw new Error("Por favor, insira um link válido do Instagram, TikTok ou YouTube");
      }

      const campaignPlatforms = campaign?.platforms || [campaign?.platform || "instagram"];
      if (!campaignPlatforms.includes(detectedPlatform)) {
        throw new Error(`Esta campanha não aceita vídeos de ${detectedPlatform}. Plataformas aceitas: ${campaignPlatforms.join(", ")}`);
      }

      const { error: insertError } = await supabase.from("campaign_videos").insert([
        {
          campaign_id: id,
          video_link: videoLink,
          platform: detectedPlatform,
          submitted_by: user?.id,
          verified: false,
        },
      ]);

      if (insertError) throw insertError;

      await n8nWebhook.trackVideo(videoLink);

      toast({
        title: "Vídeo enviado com sucesso!",
        description: "Seu vídeo está sendo rastreado. As métricas serão atualizadas em breve.",
      });

      setVideoLink("");
      fetchCampaignData();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar vídeo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
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

  if (!campaign) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Campanha não encontrada</h2>
          <Button onClick={() => navigate("/campaigns")} className="mt-4">
            Voltar para Campanhas
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Restrict access: only approved participants and admins can see full details
  const hasFullAccess = participationStatus === 'approved' || isAdmin;

  // Show restricted view for non-approved users
  if (!hasFullAccess) {
    return (
      <MainLayout>
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                {campaign.name}
              </h1>
              <Badge className={campaign.is_active ? "bg-green-500/20 text-green-400" : "bg-muted"}>
                {campaign.is_active ? "Ativa" : "Encerrada"}
              </Badge>
            </div>
          </div>

          {/* Restricted Access Card */}
          <GlowCard glowColor="purple" className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              {participationStatus === 'none' && (
                <>
                  <div className="p-4 rounded-full bg-primary/15">
                    <UserPlus className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Solicite sua Participação</h2>
                  <p className="text-muted-foreground max-w-md">
                    Para visualizar os detalhes desta campanha, ranking e enviar vídeos, 
                    você precisa solicitar participação e aguardar a aprovação.
                  </p>
                  {campaign.is_active && (
                    <Button 
                      onClick={handleRequestParticipation}
                      disabled={requestingParticipation}
                      size="lg"
                      className="mt-4 bg-gradient-to-r from-primary to-purple-500"
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      {requestingParticipation ? "Solicitando..." : "Solicitar Participação"}
                    </Button>
                  )}
                </>
              )}

              {participationStatus === 'requested' && (
                <>
                  <div className="p-4 rounded-full bg-yellow-500/15">
                    <Clock className="h-12 w-12 text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
                  <p className="text-muted-foreground max-w-md">
                    Sua solicitação de participação foi enviada. Aguarde a aprovação 
                    do administrador para ter acesso aos detalhes da campanha.
                  </p>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-base px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Solicitação Pendente
                  </Badge>
                </>
              )}

              {participationStatus === 'rejected' && (
                <>
                  <div className="p-4 rounded-full bg-red-500/15">
                    <XCircle className="h-12 w-12 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold">Participação Rejeitada</h2>
                  <p className="text-muted-foreground max-w-md">
                    Infelizmente sua solicitação de participação foi rejeitada. 
                    Entre em contato com o administrador para mais informações.
                  </p>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-base px-4 py-2">
                    <XCircle className="h-4 w-4 mr-2" />
                    Acesso Negado
                  </Badge>
                </>
              )}
            </div>
          </GlowCard>

          {/* Campaign Basic Info */}
          <GlowCard glowColor="blue">
            <h3 className="text-lg font-semibold mb-3">Sobre a Campanha</h3>
            <p className="text-muted-foreground">{campaign.description || "Sem descrição disponível."}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
              </div>
            </div>
          </GlowCard>
        </div>
      </MainLayout>
    );
  }

  const campaignPlatforms = campaign.platforms || [campaign.platform];
  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") return Instagram;
    if (platform === "tiktok") return Music;
    if (platform === "youtube") return Youtube;
    return Video;
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalParticipants = new Set(videos.map(v => v.submitted_by)).size;
  const canSubmitVideo = participationStatus === 'approved' || isAdmin;

  const getParticipationBadge = () => {
    switch (participationStatus) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Participante Aprovado
          </Badge>
        );
      case 'requested':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando Aprovação
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Participação Rejeitada
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                <Badge className={campaign.is_active ? "bg-green-500/20 text-green-400" : "bg-muted"}>
                  {campaign.is_active ? "Ativa" : "Encerrada"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-1">
                  {campaignPlatforms.map((platform) => {
                    const Icon = getPlatformIcon(platform);
                    return <Icon key={platform} className="h-4 w-4" />;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getParticipationBadge()}
            {participationStatus === 'none' && campaign.is_active && (
              <Button 
                onClick={handleRequestParticipation}
                disabled={requestingParticipation}
                className="bg-gradient-to-r from-primary to-purple-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {requestingParticipation ? "Solicitando..." : "Solicitar Participação"}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowCard glowColor="green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Views Totais</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(totalViews)}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/15">
                <Eye className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard glowColor="blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Vídeos Enviados</p>
                <p className="text-3xl font-bold mt-1">{videos.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/15">
                <Video className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard glowColor="purple">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Participantes</p>
                <p className="text-3xl font-bold mt-1">{totalParticipants}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/15">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Info & Submit */}
          <div className="space-y-6">
            {/* Description */}
            {campaign.description && (
              <GlowCard>
                <h3 className="font-semibold mb-3">Sobre a Campanha</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {campaign.description}
                </p>
              </GlowCard>
            )}

            {/* Prize */}
            {campaign.prize_description && (
              <GlowCard glowColor="orange">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/15">
                    <Award className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Prêmios</h3>
                    <p className="text-sm text-muted-foreground">{campaign.prize_description}</p>
                  </div>
                </div>
              </GlowCard>
            )}

            {/* Rules */}
            {campaign.rules && (
              <GlowCard>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Regras
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {campaign.rules}
                </p>
              </GlowCard>
            )}

            {/* Submit Form */}
            {campaign.is_active && (
              <GlowCard glowColor="primary">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Enviar Vídeo
                </h3>
                
                {canSubmitVideo ? (
                  <form onSubmit={handleSubmitVideo} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="videoLink">Link do Vídeo</Label>
                      <Input
                        id="videoLink"
                        placeholder={`Cole o link (${campaignPlatforms.join(", ")})`}
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Plataformas aceitas: {campaignPlatforms.join(", ")}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-purple-500"
                      disabled={submitting}
                    >
                      {submitting ? "Enviando..." : "Enviar Vídeo"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {participationStatus === 'requested' 
                        ? "Aguarde a aprovação para enviar vídeos."
                        : participationStatus === 'rejected'
                        ? "Sua participação foi rejeitada."
                        : "Solicite participação para enviar vídeos."}
                    </p>
                    {participationStatus === 'none' && (
                      <Button 
                        onClick={handleRequestParticipation}
                        disabled={requestingParticipation}
                        variant="outline"
                        className="w-full"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Solicitar Participação
                      </Button>
                    )}
                  </div>
                )}
              </GlowCard>
            )}
          </div>

          {/* Right Column - Ranking */}
          <div className="lg:col-span-2">
            <GlowCard>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking de Vídeos
              </h3>

              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum vídeo enviado ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seja o primeiro a participar!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div
                      key={video.id}
                      className={`p-4 rounded-xl transition-all hover:scale-[1.01] ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                          : index === 1
                          ? "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border border-gray-400/20"
                          : index === 2
                          ? "bg-gradient-to-r from-orange-600/10 to-orange-700/10 border border-orange-600/20"
                          : "bg-muted/30 border border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Position */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : index === 1
                            ? "bg-gray-400/20 text-gray-300"
                            : index === 2
                            ? "bg-orange-600/20 text-orange-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.username}</p>
                          <a
                            href={video.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary/70 hover:text-primary hover:underline truncate block"
                          >
                            Ver vídeo ↗
                          </a>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <Eye className="h-3.5 w-3.5 text-green-400" />
                            <span className="font-semibold">{formatNumber(video.views)}</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <Heart className="h-3.5 w-3.5 text-red-400" />
                            <span>{formatNumber(video.likes)}</span>
                          </div>
                          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                            <span>{formatNumber(video.comments)}</span>
                          </div>
                          {video.shares > 0 && (
                            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                              <Share2 className="h-3.5 w-3.5 text-purple-400" />
                              <span>{formatNumber(video.shares)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function CampaignDetail() {
  return (
    <ProtectedRoute>
      <CampaignDetailContent />
    </ProtectedRoute>
  );
}
