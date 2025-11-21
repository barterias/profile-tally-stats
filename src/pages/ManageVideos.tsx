import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Video,
  ArrowLeft,
  Search,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Instagram,
  Music,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  campaign_id: string;
  campaigns?: {
    name: string;
  };
}

function ManageVideosContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<CampaignVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [videos, searchTerm, filterPlatform, filterStatus]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_videos")
        .select("*, campaigns (name)")
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Buscar métricas reais das tabelas externas
      if (data && data.length > 0) {
        console.log("📹 Vídeos para processar:", data);
        
        // Buscar TODOS os vídeos do Instagram e TikTok de uma vez
        const [allInstagramVideos, allTikTokVideos] = await Promise.all([
          externalSupabase.getAllVideos(),
          externalSupabase.getSocialVideos(),
        ]);

        console.log("📱 Instagram videos:", allInstagramVideos?.length);
        console.log("🎵 TikTok videos:", allTikTokVideos?.length);

        const videosWithMetrics = data.map((video) => {
          try {
            // Normalizar o link
            const normalizeLink = (link: string) => {
              return link.split('?')[0].replace(/\/$/, '').toLowerCase();
            };

            const normalizedVideoLink = normalizeLink(video.video_link);

            if (video.platform === "instagram") {
              const instagramData = allInstagramVideos?.find(v => {
                const normalizedDbLink = normalizeLink(v.link || v.video_url || '');
                return normalizedDbLink === normalizedVideoLink;
              });

              if (instagramData) {
                return {
                  ...video,
                  views: instagramData.views || 0,
                  likes: instagramData.likes || 0,
                  comments: instagramData.comments || 0,
                  shares: instagramData.shares || 0,
                };
              }
            } else if (video.platform === "tiktok") {
              const tiktokData = allTikTokVideos?.find(v => {
                const normalizedDbLink = normalizeLink(v.link || v.video_url || '');
                return normalizedDbLink === normalizedVideoLink;
              });

              if (tiktokData) {
                return {
                  ...video,
                  views: tiktokData.views || 0,
                  likes: tiktokData.likes || 0,
                  comments: tiktokData.comments || 0,
                  shares: tiktokData.shares || 0,
                };
              }
            }
          } catch (error) {
            console.error("Erro ao buscar métricas do vídeo:", error);
          }
          return video;
        });

        console.log("✨ Vídeos processados:", videosWithMetrics);
        setVideos(videosWithMetrics);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({
        title: "Erro ao carregar vídeos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...videos];

    // Search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (v) =>
            v.video_link.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.campaigns?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

    // Platform filter
    if (filterPlatform !== "all") {
      filtered = filtered.filter((v) => v.platform === filterPlatform);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((v) =>
        filterStatus === "verified" ? v.verified : !v.verified
      );
    }

    setFilteredVideos(filtered);
  };

  const toggleVerification = async (videoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .update({ verified: !currentStatus })
        .eq("id", videoId);

      if (error) throw error;

      toast({
        title: `Vídeo ${!currentStatus ? "verificado" : "desverificado"}`,
      });

      fetchVideos();
    } catch (error) {
      toast({
        title: "Erro ao atualizar vídeo",
        variant: "destructive",
      });
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return;

    try {
      const { error } = await supabase
        .from("campaign_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      toast({
        title: "Vídeo excluído com sucesso",
      });

      fetchVideos();
    } catch (error) {
      toast({
        title: "Erro ao excluir vídeo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalViews = filteredVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const verifiedCount = filteredVideos.filter((v) => v.verified).length;

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-8 w-8 text-primary animate-float" />
            <h1 className="text-2xl font-bold text-glow">Gestão de Vídeos</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card hover-glow p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total de Vídeos</p>
            <p className="text-3xl font-bold">{filteredVideos.length}</p>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Verificados</p>
            <p className="text-3xl font-bold text-success">{verifiedCount}</p>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Pendentes</p>
            <p className="text-3xl font-bold text-warning">
              {filteredVideos.length - verifiedCount}
            </p>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Eye className="h-6 w-6 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Views Totais</p>
            <p className="text-3xl font-bold text-glow">
              {(totalViews / 1000000).toFixed(1)}M
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por link, usuário ou campeonato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as plataformas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFilterPlatform("all");
                setFilterStatus("all");
              }}
              className="neon-border"
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={fetchVideos}
              variant="outline"
              className="neon-border"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </Card>

        {/* Videos List */}
        <div className="space-y-4">
          {filteredVideos.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-xl text-muted-foreground">Nenhum vídeo encontrado</p>
            </Card>
          ) : (
            filteredVideos.map((video, index) => {
              const PlatformIcon = video.platform === "instagram" ? Instagram : Music;
              
              return (
                <Card
                  key={video.id}
                  className="glass-card p-6 hover-glow animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Platform Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        {video.platform === "instagram" ? (
                          <Instagram className="h-6 w-6 text-primary" />
                        ) : (
                          <Music className="h-6 w-6 text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              ID: {video.id.substring(0, 8)}...
                            </p>
                            <Badge variant={video.verified ? "default" : "secondary"}>
                              {video.verified ? "Verificado" : "Pendente"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {video.campaigns?.name}
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
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {format(new Date(video.submitted_at), "dd MMM yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Eye className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            {video.views?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Heart className="h-4 w-4 text-destructive" />
                          <span>{video.likes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <MessageCircle className="h-4 w-4 text-accent" />
                          <span>{video.comments?.toLocaleString() || 0}</span>
                        </div>
                        {video.shares > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Share2 className="h-4 w-4 text-success" />
                            <span>{video.shares?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={video.verified ? "outline" : "default"}
                          onClick={() => toggleVerification(video.id, video.verified)}
                          className={video.verified ? "" : "bg-success hover:bg-success/90"}
                        >
                          {video.verified ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Desverificar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verificar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteVideo(video.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default function ManageVideos() {
  return (
    <ProtectedRoute requireAdmin>
      <ManageVideosContent />
    </ProtectedRoute>
  );
}
