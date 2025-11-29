import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Clock, Target, Users, Eye, Edit, Video } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  platforms?: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  participants?: number;
  totalViews?: number;
  videoCount?: number;
}

export default function Campaigns() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "finished">("active");

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", filter === "active")
        .order("created_at", { ascending: false });

      if (data) {
        const campaignsWithStats = await Promise.all(
          data.map(async (campaign) => {
            const { data: videos } = await supabase
              .from("campaign_videos")
              .select("*")
              .eq("campaign_id", campaign.id);

            const participants = new Set(videos?.map((v) => v.submitted_by)).size;
            const videoCount = videos?.length || 0;

            let totalViews = 0;
            if (videos && videos.length > 0) {
              const [allInstagramVideos, allTikTokVideos] = await Promise.all([
                externalSupabase.getAllVideos(),
                externalSupabase.getSocialVideos(),
              ]);

              const viewsPromises = videos.map(async (video) => {
                try {
                  if (video.platform === "instagram") {
                    const match = allInstagramVideos.find((v) => v.link === video.video_link);
                    return match?.views || 0;
                  } else if (video.platform === "tiktok") {
                    const videoIdMatch = video.video_link.match(/\/video\/(\d+)/);
                    const videoId = videoIdMatch ? videoIdMatch[1] : null;

                    if (videoId) {
                      const match = allTikTokVideos.find((v) => v.video_id === videoId);
                      if (match) return match.views || 0;
                    }

                    const matchByLink = allTikTokVideos.find(
                      (v) => v.link === video.video_link || v.video_url?.includes(video.video_link)
                    );
                    return matchByLink?.views || 0;
                  }
                } catch (error) {
                  console.error("Erro ao buscar métricas:", error);
                }
                return 0;
              });

              const viewsArray = await Promise.all(viewsPromises);
              totalViews = viewsArray.reduce((sum, views) => sum + views, 0);
            }

            return {
              ...campaign,
              participants,
              totalViews,
              videoCount,
            };
          })
        );

        setCampaigns(campaignsWithStats);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    navigate(`/admin/edit-campaign/${campaignId}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-glow mb-1">Competições</h1>
            <p className="text-muted-foreground text-sm">
              Participe das competições e ganhe prêmios
            </p>
          </div>
          {isAdmin && (
            <Button
              className="premium-gradient"
              onClick={() => navigate("/admin/create-campaign")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Competição
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            size="sm"
          >
            <Target className="h-4 w-4 mr-2" />
            Ativas
          </Button>
          <Button
            variant={filter === "finished" ? "default" : "outline"}
            onClick={() => setFilter("finished")}
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Encerradas
          </Button>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma competição {filter === "active" ? "ativa" : "encerrada"}
            </h3>
            {isAdmin && filter === "active" && (
              <Button
                className="mt-4"
                onClick={() => navigate("/admin/create-campaign")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Competição
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="glass-card-hover cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/campaign/${campaign.id}`)}
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{campaign.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          {(campaign.platforms || [campaign.platform]).map((platform) => (
                            <Badge
                              key={platform}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {platform === "instagram" && "📸"}
                              {platform === "tiktok" && "🎵"}
                              {platform === "youtube" && "▶️"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleEditClick(e, campaign.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge
                        className={
                          campaign.is_active
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {campaign.is_active ? "Ativa" : "Encerrada"}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  {/* Prize */}
                  {campaign.prize_description && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-0.5">Prêmio</p>
                      <p className="text-sm font-semibold text-primary line-clamp-1">
                        {campaign.prize_description}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} -{" "}
                      {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campaign.participants || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campaign.videoCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {(campaign.totalViews || 0) > 1000
                            ? `${((campaign.totalViews || 0) / 1000).toFixed(1)}k`
                            : campaign.totalViews || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
