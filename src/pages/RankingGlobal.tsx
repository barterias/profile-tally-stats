import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Eye, Heart, MessageCircle, Calendar, Instagram, Music, TrendingUp } from "lucide-react";
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
  saves?: number;
  downloads?: number;
  thumbnail?: string;
  video_id?: string;
  creator_username?: string;
  title?: string;
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

      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", selectedCampaign)
        .order("submitted_at", { ascending: false });

      if (!campaignVideos || campaignVideos.length === 0) {
        setRanking([]);
        return;
      }

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

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyVideos = campaignVideos.filter((video) => {
        const submittedDate = new Date(video.submitted_at);
        return submittedDate >= startOfMonth && submittedDate <= endOfMonth;
      });

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
                creator_username: match.creator_username,
                title: match.title,
              };
            }
          } else if (video.platform === "tiktok") {
            const videoId = extractVideoId(video.video_link);
            const match = allTikTokVideos?.find(v => {
              const dbLink = normalizeLink(v.link || v.video_url || '');
              return dbLink === normalizedCampaignLink || 
                     dbLink.includes(normalizedCampaignLink) || 
                     normalizedCampaignLink.includes(dbLink) ||
                     (videoId && (v.video_id === videoId || v.video_id === `=${videoId}`));
            });

            if (match) {
              return {
                video_link: video.video_link,
                platform: video.platform,
                views: match.views || 0,
                likes: match.likes || 0,
                comments: match.comments || 0,
                shares: match.shares || 0,
                saves: match.saves || 0,
                downloads: match.downloads || 0,
                thumbnail: match.thumbnail,
                video_id: extractVideoId(video.video_link),
                creator_username: match.creator_username,
                title: match.title,
              };
            }
          }

          return null;
        })
      );

      const validVideos = videosWithMetrics
        .filter((v): v is NonNullable<typeof v> => v !== null && v.views > 0)
        .sort((a, b) => b.views - a.views)
        .map((video, index) => ({
          ...video,
          position: index + 1,
        }));

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

        {selectedCampaign && ranking.length > 0 && (
          <div className="space-y-4">
            {ranking.map((entry, index) => (
              <Card
                key={entry.position}
                className={`glass-card-hover overflow-hidden animate-slide-in-right ${
                  entry.position <= 3 ? "neon-border" : ""
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex gap-6 p-6">
                  <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    <Badge
                      className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${getRankBadgeColor(entry.position)}`}
                    >
                      #{entry.position}
                    </Badge>
                    {entry.position === 1 && (
                      <Trophy className="h-6 w-6 text-yellow-500 mt-2 animate-pulse-glow" />
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {entry.thumbnail ? (
                      <img
                        src={entry.thumbnail}
                        alt={entry.title || "Post thumbnail"}
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
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        {entry.creator_username && (
                          <p className="text-sm text-muted-foreground">@{entry.creator_username}</p>
                        )}
                        {entry.title && (
                          <p className="font-medium line-clamp-2">{entry.title}</p>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {entry.platform}
                        </Badge>
                      </div>
                      <a
                        href={entry.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline whitespace-nowrap"
                      >
                        Ver Post →
                      </a>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">Views</span>
                        </div>
                        <p className="text-sm font-bold">
                          {entry.views >= 1000000
                            ? `${(entry.views / 1000000).toFixed(1)}M`
                            : entry.views >= 1000
                            ? `${(entry.views / 1000).toFixed(1)}K`
                            : entry.views}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs">Likes</span>
                        </div>
                        <p className="text-sm font-bold">
                          {entry.likes >= 1000
                            ? `${(entry.likes / 1000).toFixed(1)}K`
                            : entry.likes}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs">Comments</span>
                        </div>
                        <p className="text-sm font-bold">{entry.comments}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">Shares</span>
                        </div>
                        <p className="text-sm font-bold">{entry.shares || 0}</p>
                      </div>

                      {entry.platform === "tiktok" && entry.saves !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">💾 Saves</span>
                          </div>
                          <p className="text-sm font-bold">{entry.saves}</p>
                        </div>
                      )}

                      {entry.platform === "tiktok" && entry.downloads !== undefined && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">⬇️ Downloads</span>
                          </div>
                          <p className="text-sm font-bold">{entry.downloads}</p>
                        </div>
                      )}
                    </div>
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
