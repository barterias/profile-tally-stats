import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Clock, Target, Users, Eye } from "lucide-react";
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
        // Buscar estatísticas para cada campanha
        const campaignsWithStats = await Promise.all(
          data.map(async (campaign) => {
            const { data: videos } = await supabase
              .from("campaign_videos")
              .select("*")
              .eq("campaign_id", campaign.id);

            const participants = new Set(videos?.map((v) => v.submitted_by)).size;
            
            // Buscar métricas reais das tabelas externas
            let totalViews = 0;
            if (videos && videos.length > 0) {
              // Buscar todos os vídeos de uma vez
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
                    // Extrair video_id do link
                    const videoIdMatch = video.video_link.match(/\/video\/(\d+)/);
                    const videoId = videoIdMatch ? videoIdMatch[1] : null;
                    
                    if (videoId) {
                      const match = allTikTokVideos.find((v) => v.video_id === videoId);
                      if (match) return match.views || 0;
                    }
                    
                    // Fallback: buscar por link
                    const matchByLink = allTikTokVideos.find((v) =>
                      v.link === video.video_link || v.video_url?.includes(video.video_link)
                    );
                    return matchByLink?.views || 0;
                  }
                } catch (error) {
                  console.error("Erro ao buscar métricas do vídeo:", error);
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Competições</h1>
            <p className="text-muted-foreground">
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

        <div className="flex gap-2">
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
          >
            <Target className="h-4 w-4 mr-2" />
            Ativas
          </Button>
          <Button
            variant={filter === "finished" ? "default" : "outline"}
            onClick={() => setFilter("finished")}
          >
            <Clock className="h-4 w-4 mr-2" />
            Encerradas
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma competição {filter === "active" ? "ativa" : "encerrada"}
            </h3>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="glass-card-hover cursor-pointer overflow-hidden"
                onClick={() => navigate(`/campaign/${campaign.id}`)}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <Trophy className="h-8 w-8 text-primary" />
                    <Badge
                      className={
                        campaign.is_active
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {campaign.is_active ? "Ativa" : "Encerrada"}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-2">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {(campaign.platforms || [campaign.platform]).map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform === "instagram" && "📸"}
                          {platform === "tiktok" && "🎵"}
                          {platform === "youtube" && "▶️"}
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {campaign.prize_description && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Prêmio</p>
                      <p className="text-sm font-semibold text-primary">
                        {campaign.prize_description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(campaign.start_date), "dd MMM", {
                        locale: ptBR,
                      })}{" "}
                      -{" "}
                      {format(new Date(campaign.end_date), "dd MMM yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {campaign.participants || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {(campaign.totalViews || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver Detalhes
                    </Button>
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
