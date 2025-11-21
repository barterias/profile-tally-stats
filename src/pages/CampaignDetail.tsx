import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase, n8nWebhook } from "@/lib/externalSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
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
}

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

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch campaign videos
      const { data: videosData, error: videosError } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", id);

      if (videosError) throw videosError;

      // Buscar métricas reais das tabelas externas
      if (videosData && videosData.length > 0) {
        console.log("📹 Vídeos da campanha:", videosData);
        
        // Buscar TODOS os vídeos do Instagram e TikTok de uma vez
        const [allInstagramVideos, allTikTokVideos] = await Promise.all([
          externalSupabase.getAllVideos(),
          externalSupabase.getSocialVideos(),
        ]);

        console.log("📱 Instagram videos disponíveis:", allInstagramVideos?.length);
        console.log("🎵 TikTok videos disponíveis:", allTikTokVideos?.length);

        const videosWithMetrics = videosData.map((video) => {
          try {
            // Normalizar o link removendo trailing slash e query params
            const normalizeLink = (link: string) => {
              return link.split('?')[0].replace(/\/$/, '').toLowerCase();
            };

            const normalizedVideoLink = normalizeLink(video.video_link);
            console.log(`🔍 Buscando métricas para: ${normalizedVideoLink}`);

            if (video.platform === "instagram") {
              // Buscar da tabela videos (Instagram)
              const instagramData = allInstagramVideos?.find(v => {
                const normalizedDbLink = normalizeLink(v.link || v.video_url || '');
                const match = normalizedDbLink === normalizedVideoLink;
                if (match) console.log(`✅ Match Instagram encontrado:`, v);
                return match;
              });

              if (instagramData) {
                return {
                  ...video,
                  views: instagramData.views || 0,
                  likes: instagramData.likes || 0,
                  comments: instagramData.comments || 0,
                  shares: instagramData.shares || 0,
                };
              } else {
                console.log(`❌ Instagram não encontrado para: ${normalizedVideoLink}`);
              }
            } else if (video.platform === "tiktok") {
              // Buscar da tabela social_videos (TikTok)
              const tiktokData = allTikTokVideos?.find(v => {
                const normalizedDbLink = normalizeLink(v.link || v.video_url || '');
                const match = normalizedDbLink === normalizedVideoLink;
                if (match) console.log(`✅ Match TikTok encontrado:`, v);
                return match;
              });

              if (tiktokData) {
                return {
                  ...video,
                  views: tiktokData.views || 0,
                  likes: tiktokData.likes || 0,
                  comments: tiktokData.comments || 0,
                  shares: tiktokData.shares || 0,
                };
              } else {
                console.log(`❌ TikTok não encontrado para: ${normalizedVideoLink}`);
              }
            }
          } catch (error) {
            console.error("Erro ao buscar métricas do vídeo:", error);
          }
          return video;
        });

        console.log("✨ Vídeos com métricas:", videosWithMetrics);

        // Ordenar por views
        const sortedVideos = videosWithMetrics.sort((a, b) => (b.views || 0) - (a.views || 0));
        setVideos(sortedVideos);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast({
        title: "Erro ao carregar campeonato",
        description: "Não foi possível carregar os dados do campeonato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate URL
      if (!videoLink.includes("instagram.com") && !videoLink.includes("tiktok.com")) {
        throw new Error("Por favor, insira um link válido do Instagram ou TikTok");
      }

      // Insert video record
      const { error: insertError } = await supabase.from("campaign_videos").insert([
        {
          campaign_id: id,
          video_link: videoLink,
          platform: campaign?.platform || "instagram",
          submitted_by: user?.id,
          verified: false,
        },
      ]);

      if (insertError) throw insertError;

      // Track video via webhook
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-dark">
        <Card className="glass-card p-8 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Campeonato não encontrado</h2>
          <Button onClick={() => navigate("/campaigns")} className="mt-4">
            Voltar para Campeonatos
          </Button>
        </Card>
      </div>
    );
  }

  const PlatformIcon = campaign.platform === "instagram" ? Instagram : Music;
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalParticipants = new Set(videos.map(v => v.submitted_by)).size;

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlatformIcon className="h-8 w-8 text-primary animate-float" />
            <h1 className="text-2xl font-bold text-glow">{campaign.name}</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Campaign Info */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Badge className={campaign.is_active ? "bg-success" : "bg-muted"}>
              {campaign.is_active ? "Ativo" : "Encerrado"}
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} -{" "}
                {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          <p className="text-lg text-muted-foreground mb-6">{campaign.description}</p>

          {campaign.prize_description && (
            <Card className="glass-card neon-border p-6 mb-6">
              <div className="flex items-start gap-4">
                <Award className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-glow">Prêmios</h3>
                  <p className="text-muted-foreground">{campaign.prize_description}</p>
                </div>
              </div>
            </Card>
          )}

          {campaign.rules && (
            <Card className="glass-card p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Regras
              </h3>
              <p className="text-muted-foreground whitespace-pre-line">{campaign.rules}</p>
            </Card>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card hover-glow p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Views Totais</p>
            <p className="text-3xl font-bold text-glow">{totalViews.toLocaleString()}</p>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Video className="h-6 w-6 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Vídeos Enviados</p>
            <p className="text-3xl font-bold">{videos.length}</p>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Participantes</p>
            <p className="text-3xl font-bold">{totalParticipants}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submit Video Form */}
          {campaign.is_active && (
            <div className="lg:col-span-1">
              <Card className="glass-card neon-border p-6 animate-scale-in sticky top-24">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Enviar Vídeo
                </h3>
                <form onSubmit={handleSubmitVideo} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoLink">Link do Vídeo</Label>
                    <Input
                      id="videoLink"
                      placeholder={`Cole o link do ${campaign.platform === "instagram" ? "Instagram" : "TikTok"}`}
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole o link completo do seu vídeo
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={submitting}
                  >
                    {submitting ? "Enviando..." : "Enviar Vídeo"}
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* Ranking */}
          <div className={campaign.is_active ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="glass-card p-6 animate-fade-in">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking
              </h3>

              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum vídeo enviado ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video, index) => (
                    <Card
                      key={video.id}
                      className={`p-4 transition-all hover:scale-[1.02] ${
                        index === 0
                          ? "bg-gradient-to-r from-primary/20 to-accent/20 neon-border"
                          : index === 1
                          ? "bg-accent/10 border-accent/30"
                          : index === 2
                          ? "bg-warning/10 border-warning/30"
                          : "bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Position */}
                        <div className="flex-shrink-0">
                          {index < 3 ? (
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                index === 0
                                  ? "bg-primary text-primary-foreground"
                                  : index === 1
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-warning text-warning-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-lg">
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            Participante #{index + 1}
                          </p>
                          <a
                            href={video.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate block"
                          >
                            {video.video_link}
                          </a>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-sm flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{video.views?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-destructive" />
                            <span>{video.likes?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4 text-accent" />
                            <span>{video.comments?.toLocaleString() || 0}</span>
                          </div>
                          {video.shares > 0 && (
                            <div className="flex items-center gap-1">
                              <Share2 className="h-4 w-4 text-success" />
                              <span>{video.shares?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CampaignDetail() {
  return (
    <ProtectedRoute>
      <CampaignDetailContent />
    </ProtectedRoute>
  );
}
