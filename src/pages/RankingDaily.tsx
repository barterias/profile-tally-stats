import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Eye, Heart, MessageCircle, Instagram, Music, Calendar, Trophy } from "lucide-react";

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
  submitted_by: string;
  creator_username?: string;
  title?: string;
}

export default function RankingDaily() {
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
        .order("created_at", { ascending: false });
      
      setCampaigns(data || []);
      
      if (data && data.length > 0) {
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
    
    setLoading(true);
    try {
      const { data: videos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", selectedCampaign);

      if (!videos || videos.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      const [allInstagramVideos, allTikTokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      const extractVideoId = (link: string): string | null => {
        if (!link) return null;
        const instaMatch = link.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
        if (instaMatch) return instaMatch[2];
        const tiktokMatch = link.match(/\/video\/(\d+)/);
        if (tiktokMatch) return tiktokMatch[1];
        return null;
      };

      const videosWithMetrics = videos.map((video) => {
        const videoId = extractVideoId(video.video_link);
        let thumbnail = undefined;
        
        if (video.platform === "instagram" && videoId) {
          const match = allInstagramVideos?.find(v => {
            const dbId = extractVideoId(v.link || v.video_url || '');
            return dbId === videoId;
          });
          
          if (match) {
            thumbnail = match.thumbnail || match.post_image;
            return {
              ...video,
              views: match.views || 0,
              likes: match.likes || 0,
              comments: match.comments || 0,
              shares: match.shares || 0,
              thumbnail,
              creator_username: match.creator_username,
              title: match.title,
            };
          }
        } else if (video.platform === "tiktok" && videoId) {
          const match = allTikTokVideos?.find(v => {
            const dbId = extractVideoId(v.link || v.video_url || '');
            return dbId === videoId || v.video_id === videoId || v.video_id === `=${videoId}`;
          });
          
          if (match) {
            thumbnail = match.thumbnail;
            console.log('🎬 TikTok Match encontrado:', {
              videoId,
              thumbnail: match.thumbnail,
              hasThumb: !!match.thumbnail,
              link: match.link || match.video_url
            });
            return {
              ...video,
              views: match.views || 0,
              likes: match.likes || 0,
              comments: match.comments || 0,
              shares: match.shares || 0,
              saves: match.saves || 0,
              downloads: match.downloads || 0,
              thumbnail,
              creator_username: match.creator_username,
              title: match.title,
            };
          }
        }
        
        return { ...video, thumbnail };
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayVideos = videosWithMetrics
        .filter(v => {
          const submittedDate = new Date(v.submitted_at);
          submittedDate.setHours(0, 0, 0, 0);
          return submittedDate.getTime() === today.getTime();
        })
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .map((video, index) => ({
          position: index + 1,
          video_link: video.video_link,
          platform: video.platform,
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          saves: (video as any).saves || 0,
          downloads: (video as any).downloads || 0,
          thumbnail: video.thumbnail,
          submitted_by: video.submitted_by,
          creator_username: (video as any).creator_username,
          title: (video as any).title,
        }));

      setRanking(todayVideos);
    } catch (error) {
      console.error("Error fetching ranking:", error);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading && campaigns.length === 0) {
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

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Ranking Diário</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Posts mais virais de hoje - {today}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[280px] neon-border">
                <SelectValue placeholder="Selecione uma competição" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      {campaign.platform === "instagram" ? (
                        <Instagram className="h-4 w-4" />
                      ) : (
                        <Music className="h-4 w-4" />
                      )}
                      {campaign.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary animate-float" />
              <span className="text-2xl font-bold text-glow">{ranking.length}</span>
              <span className="text-muted-foreground">posts</span>
            </div>
          </div>
        </div>

        {!selectedCampaign && (
          <Card className="glass-card p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Selecione uma Competição</h3>
            <p className="text-muted-foreground">
              Escolha uma competição acima para ver o ranking diário
            </p>
          </Card>
        )}

        {selectedCampaign && ranking.length === 0 && !loading && (
          <Card className="glass-card p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum post hoje</h3>
            <p className="text-muted-foreground">
              Ainda não há posts submetidos hoje nesta competição
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
