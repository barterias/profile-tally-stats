import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlowCard } from "@/components/ui/GlowCard";
import MainLayout from "@/components/Layout/MainLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Award,
  Users,
  Video,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Instagram,
  Music,
  Youtube,
  Edit,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  hashtags: string[];
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
  hashtags?: string[];
}

function CampaignDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast: toastHook } = useToast();
  const { user, isAdmin } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // Determine the correct back navigation path
  const getBackPath = () => {
    const referrer = location.state?.from;
    if (referrer) return referrer;
    if (isAdmin) return "/admin/campaigns";
    if (isOwner) return "/client/campaigns";
    return "/campaigns";
  };

  useEffect(() => {
    fetchCampaignData();
    checkOwnership();
  }, [id, user]);

  const checkOwnership = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("campaign_owners")
      .select("id")
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setIsOwner(!!data);
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success(campaign.is_active ? "Campanha pausada" : "Campanha ativada");
      setCampaign({ ...campaign, is_active: !campaign.is_active });
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;
      
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success("Vídeo removido do ranking");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover vídeo");
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleSyncVideoMetrics = async (video: CampaignVideo) => {
    try {
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: { 
          videoUrl: video.video_link,
          updateDatabase: true,
          tableId: video.id
        },
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        const updatedMetrics = {
          views: data.data.viewsCount || 0,
          likes: data.data.likesCount || 0,
          comments: data.data.commentsCount || 0,
          shares: data.data.sharesCount || 0,
        };
        
        // Update local state
        setVideos(videos.map(v => 
          v.id === video.id ? { ...v, ...updatedMetrics } : v
        ).sort((a, b) => (b.views || 0) - (a.views || 0)));
        
        // Update database
        await supabase
          .from("campaign_videos")
          .update(updatedMetrics)
          .eq("id", video.id);
          
        toast.success("Métricas atualizadas!");
      }
    } catch (error: any) {
      console.error("Error syncing metrics:", error);
      toast.error("Erro ao sincronizar métricas");
    }
  };

  const handleSyncAllMetrics = async () => {
    setSyncingMetrics(true);
    let successCount = 0;
    let errorCount = 0;
    let invalidUrlCount = 0;

    for (const video of videos) {
      try {
        const { data, error } = await supabase.functions.invoke('video-details', {
          body: { 
            videoUrl: video.video_link,
          },
        });

        if (!error && data?.success && data?.data) {
          const updatedMetrics = {
            views: data.data.viewsCount || 0,
            likes: data.data.likesCount || 0,
            comments: data.data.commentsCount || 0,
            shares: data.data.sharesCount || 0,
          };
          
          const { error: updateError } = await supabase
            .from("campaign_videos")
            .update(updatedMetrics)
            .eq("id", video.id);
          
          if (updateError) {
            console.error(`Error updating video ${video.id}:`, updateError);
            errorCount++;
          } else {
            // Update local state immediately
            setVideos(prev => prev.map(v => 
              v.id === video.id 
                ? { ...v, ...updatedMetrics }
                : v
            ));
            successCount++;
          }
        } else if (data?.invalidUrl) {
          // URL is invalid (e.g., profile URL instead of video URL)
          invalidUrlCount++;
          console.warn(`Invalid URL for video ${video.id}: ${video.video_link}`);
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    // Refresh data
    await fetchCampaignData();
    setSyncingMetrics(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} vídeo(s) atualizados`);
    }
    if (invalidUrlCount > 0) {
      toast.warning(`${invalidUrlCount} link(s) inválidos (URLs de perfil não são permitidas)`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} vídeo(s) com erro`);
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

      // Fetch videos submitted to this campaign - use stored data from campaign_videos table
      const { data: videosData } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", id);

      if (videosData && videosData.length > 0) {
        // Get usernames for all submitted_by users
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

        // Process videos using stored metrics from campaign_videos table
        const processedVideos = videosData.map((video) => ({
          id: video.id,
          video_link: video.video_link,
          platform: video.platform,
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          submitted_at: video.submitted_at,
          submitted_by: video.submitted_by,
          verified: video.verified,
          username: usernamesMap[video.submitted_by] || `Participante #${video.id.slice(0, 4)}`,
        })).sort((a, b) => (b.views || 0) - (a.views || 0));

        setVideos(processedVideos);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toastHook({
        title: "Erro ao carregar campanha",
        description: "Não foi possível carregar os dados da campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const campaignPlatforms = campaign.platforms || [campaign.platform];
  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") return Instagram;
    if (platform === "tiktok") return Music;
    if (platform === "youtube") return Youtube;
    return Video;
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalParticipants = new Set(videos.map(v => v.username)).size;

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(getBackPath())}>
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
          
          {/* Admin Actions - Only for admins */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/edit-campaign/${campaign.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant={campaign.is_active ? "outline" : "default"}
                size="sm"
                onClick={handleToggleStatus}
              >
                {campaign.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Hashtags Badge */}
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
                <p className="text-sm text-muted-foreground font-medium">Vídeos Reconhecidos</p>
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
          {/* Left Column - Campaign Info */}
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
          </div>

          {/* Right Column - Ranking */}
          <div className="lg:col-span-2">
            <GlowCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Ranking de Vídeos
                </h3>
                {(isAdmin || isOwner) && videos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAllMetrics}
                    disabled={syncingMetrics}
                  >
                    {syncingMetrics ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar Métricas
                  </Button>
                )}
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum vídeo submetido ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Participe enviando o link do seu vídeo
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

                        {/* Platform Icon */}
                        <div className="hidden sm:flex">
                          {video.platform === "instagram" && (
                            <Instagram className="h-5 w-5 text-pink-400" />
                          )}
                          {video.platform === "tiktok" && (
                            <Music className="h-5 w-5 text-cyan-400" />
                          )}
                          {video.platform === "youtube" && (
                            <Youtube className="h-5 w-5 text-red-400" />
                          )}
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
                        <div className="flex items-center gap-2 text-sm">
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

                        {/* Admin/Owner Actions */}
                        {(isAdmin || isOwner) && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSyncVideoMetrics(video)}
                              title="Atualizar métricas"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deletingVideoId === video.id}
                                  title="Remover vídeo"
                                >
                                  {deletingVideoId === video.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Vídeo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover este vídeo do ranking? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteVideo(video.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
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
