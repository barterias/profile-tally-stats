import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Eye, Heart, MessageCircle, Calendar, Instagram, Music } from "lucide-react";
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
  platform: string;
}

interface RankedVideo {
  position: number;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  thumbnail?: string;
  video_id?: string;
}

export default function RankingGlobal() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [ranking, setRanking] = useState<RankedVideo[]>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchRanking();
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, platform")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setCampaigns(data);
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    if (!selectedCampaign) return;

    try {
      setLoading(true);

      // Buscar vídeos da campanha
      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", selectedCampaign)
        .order("submitted_at", { ascending: false });

      if (!campaignVideos || campaignVideos.length === 0) {
        setRanking([]);
        return;
      }

      console.log("📹 Vídeos submetidos na campanha:", campaignVideos.length, "vídeos");

      // Buscar TODOS os vídeos do Instagram e TikTok
      const [allInstagramVideos, allTikTokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      console.log("📱 Instagram DB total:", allInstagramVideos?.length || 0);
      console.log("🎵 TikTok DB total:", allTikTokVideos?.length || 0);

      // Normalizar links
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

      // Filtrar vídeos do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyVideos = campaignVideos.filter((video) => {
        const submittedDate = new Date(video.submitted_at);
        return submittedDate >= startOfMonth && submittedDate <= endOfMonth;
      });

      console.log("📅 Vídeos do mês atual:", monthlyVideos.length);

      // Processar cada vídeo buscando métricas reais
      const videosWithMetrics = await Promise.all(
        monthlyVideos.map(async (video) => {
          const normalizedCampaignLink = normalizeLink(video.video_link);

          if (video.platform === "instagram") {
            const match = allInstagramVideos?.find(v => {
              const dbLink = normalizeLink(v.link || v.video_url || '');
              return dbLink === normalizedCampaignLink || 
                     dbLink.includes(normalizedCampaignLink) || 
                     normalizedCampaignLink.includes(dbLink);
            });

            if (match) {
              return {
                video_link: video.video_link,
                platform: video.platform,
                views: match.views || 0,
                likes: match.likes || 0,
                comments: match.comments || 0,
                shares: match.shares || 0,
                thumbnail: match.thumbnail || match.post_image,
                video_id: extractVideoId(video.video_link),
              };
            }
          } else if (video.platform === "tiktok") {
            const match = allTikTokVideos?.find(v => {
              const dbLink = normalizeLink(v.link || v.video_url || '');
              return dbLink === normalizedCampaignLink || 
                     dbLink.includes(normalizedCampaignLink) || 
                     normalizedCampaignLink.includes(dbLink);
            });

            if (match) {
              return {
                video_link: video.video_link,
                platform: video.platform,
                views: match.views || 0,
                likes: match.likes || 0,
                comments: match.comments || 0,
                shares: match.shares || 0,
                thumbnail: match.thumbnail,
                video_id: extractVideoId(video.video_link),
              };
            }
          }

          return null;
        })
      );

      // Filtrar nulos e ordenar por views
      const validVideos = videosWithMetrics
        .filter((v): v is NonNullable<typeof v> => v !== null && v.views > 0)
        .sort((a, b) => b.views - a.views)
        .map((video, index) => ({
          ...video,
          position: index + 1,
        }));

      console.log("✨ Métricas carregadas:", {
        total: validVideos.length,
        comViews: validVideos.filter(v => v.views > 0).length,
        totalViews: validVideos.reduce((sum, v) => sum + v.views, 0),
      });

      setRanking(validVideos);
    } catch (error) {
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const getRankBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 text-yellow-950";
    if (position === 2) return "bg-gray-400 text-gray-950";
    if (position === 3) return "bg-orange-600 text-orange-950";
    return "bg-muted text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-glow mb-2">Ranking Mensal</h1>
              <p className="text-muted-foreground">
                Vídeos do mês atual - {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary animate-float" />
              <Trophy className="h-8 w-8 text-primary animate-float" />
            </div>
          </div>

          {/* Campaign Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Competição:</label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione uma competição" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {ranking.length} vídeo{ranking.length !== 1 ? 's' : ''} neste mês
            </span>
          </div>
        </div>

        {!selectedCampaign && !loading && (
          <Card className="glass-card p-12 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Selecione uma Competição</h3>
            <p className="text-muted-foreground">
              Escolha uma competição acima para ver o ranking mensal
            </p>
          </Card>
        )}

        {selectedCampaign && ranking.length === 0 && !loading && (
          <Card className="glass-card p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum Vídeo Este Mês</h3>
            <p className="text-muted-foreground">
              Ainda não há vídeos submetidos nesta competição para o mês atual
            </p>
          </Card>
        )}

        {/* Top 3 Podium */}
        {selectedCampaign && ranking.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ranking.slice(0, 3).map((entry) => (
            <Card
              key={entry.position}
              className={`glass-card-hover p-6 animate-scale-in relative ${
                entry.position === 1 ? "md:col-start-2 md:row-start-1 neon-border" : ""
              }`}
              style={{ animationDelay: `${entry.position * 0.1}s` }}
            >
              <div className="absolute -top-4 -right-4">
                <Badge className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${getRankBadgeColor(entry.position)}`}>
                  #{entry.position}
                </Badge>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt="Post thumbnail"
                      className="h-32 w-32 rounded-lg object-cover border-2 border-primary/50"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-lg bg-primary/10 border-2 border-primary/50 flex items-center justify-center">
                      {entry.platform === "instagram" ? (
                        <Instagram className="h-12 w-12 text-primary" />
                      ) : (
                        <Music className="h-12 w-12 text-primary" />
                      )}
                    </div>
                  )}
                  {entry.position === 1 && (
                    <Trophy className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-pulse-glow" />
                  )}
                </div>

                <div className="space-y-2 w-full">
                  <Badge variant="outline" className="text-xs">
                    {entry.platform}
                  </Badge>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">Views</span>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {(entry.views / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span className="text-xs">Likes</span>
                      </div>
                      <p className="text-lg font-bold">
                        {(entry.likes / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>

                  <a
                    href={entry.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline block mt-2"
                  >
                    Ver post →
                  </a>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}

        {/* Rest of Ranking */}
        {selectedCampaign && ranking.length > 3 && (
          <div className="space-y-3">
            {ranking.slice(3).map((entry, index) => (
            <Card
              key={entry.position}
              className="glass-card-hover p-4 animate-slide-in-right"
              style={{ animationDelay: `${(index + 3) * 0.02}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex-shrink-0">
                  <Badge className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${getRankBadgeColor(entry.position)}`}>
                    #{entry.position}
                  </Badge>
                </div>

                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt="Post thumbnail"
                      className="h-16 w-16 rounded-lg object-cover border border-primary/30"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      {entry.platform === "instagram" ? (
                        <Instagram className="h-6 w-6 text-primary" />
                      ) : (
                        <Music className="h-6 w-6 text-primary" />
                      )}
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {entry.platform}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.views >= 1000000 
                          ? `${(entry.views / 1000000).toFixed(1)}M`
                          : `${(entry.views / 1000).toFixed(1)}K`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold">
                        {(entry.likes / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.comments.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Comments</p>
                    </div>
                  </div>
                </div>

                {/* Link */}
                <div className="flex-shrink-0">
                  <a
                    href={entry.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver post →
                  </a>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
