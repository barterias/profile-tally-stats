import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Eye,
  Video,
  Trophy,
  TrendingUp,
  LogOut,
  Settings,
  Plus,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  prize_description: string;
}

interface UserStats {
  totalViews: number;
  totalVideos: number;
  participatingCampaigns: number;
}

function IndexContent() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalViews: 0,
    totalVideos: 0,
    participatingCampaigns: 0,
  });
  const [globalStats, setGlobalStats] = useState({
    totalViews: 0,
    totalVideos: 0,
    totalCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .order("start_date", { ascending: false });

      setCampaigns(campaignsData || []);

      if (isAdmin) {
        // Fetch global stats for admin
        const [instagramVideos, tiktokVideos] = await Promise.all([
          externalSupabase.getAllVideos(),
          externalSupabase.getSocialVideos(),
        ]);

        const totalViews = [...instagramVideos, ...tiktokVideos].reduce(
          (sum, video) => sum + (video.views || 0),
          0
        );

        setGlobalStats({
          totalViews,
          totalVideos: instagramVideos.length + tiktokVideos.length,
          totalCampaigns: campaignsData?.length || 0,
        });
      } else {
        // Fetch user-specific stats
        const { data: userVideos } = await supabase
          .from("campaign_videos")
          .select("*, campaign:campaigns(name)")
          .eq("submitted_by", user?.id);

        // Buscar métricas reais das views externas
        let totalViews = 0;
        if (userVideos && userVideos.length > 0) {
          const viewsPromises = userVideos.map(async (video) => {
            try {
              if (video.platform === "instagram") {
                const instagramData = await externalSupabase.getVideoByLink(video.video_link);
                return instagramData?.views || 0;
              } else if (video.platform === "tiktok") {
                const allSocialVideos = await externalSupabase.getSocialVideos();
                const tiktokData = allSocialVideos.find((v) =>
                  v.link === video.video_link || v.video_url?.includes(video.video_link)
                );
                return tiktokData?.views || 0;
              }
            } catch (error) {
              console.error("Erro ao buscar métricas do vídeo:", error);
            }
            return 0;
          });

          const viewsArray = await Promise.all(viewsPromises);
          totalViews = viewsArray.reduce((sum, views) => sum + views, 0);
        }

        const participatingCampaigns = new Set(userVideos?.map(v => v.campaign_id)).size;

        setUserStats({
          totalViews,
          totalVideos: userVideos?.length || 0,
          participatingCampaigns,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter((c) => c.is_active);
  const endedCampaigns = campaigns.filter((c) => !c.is_active);

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary animate-float" />
            <h1 className="text-2xl font-bold text-glow">
              {isAdmin ? "Painel Admin" : "Meus Campeonatos"}
            </h1>
          </div>
          <nav className="flex gap-4 items-center">
            {isAdmin && (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="ghost" onClick={() => navigate("/manage-videos")}>
                  Gestão
                </Button>
                <Button variant="ghost" onClick={() => navigate("/video-analytics")}>
                  Vídeos
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate("/campaigns")}>
              Campeonatos
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-glow">
            {isAdmin ? "Gestão de Campeonatos" : `Bem-vindo, ${user?.email?.split("@")[0]}!`}
          </h2>
          <p className="text-muted-foreground text-lg">
            {isAdmin
              ? "Gerencie todos os campeonatos, vídeos e estatísticas em um só lugar"
              : "Acompanhe seu desempenho e participe dos campeonatos ativos"}
          </p>
        </div>

        {/* Stats Cards */}
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total de Views</p>
              <p className="text-3xl font-bold text-glow">
                {(globalStats.totalViews / 1000000).toFixed(1)}M
              </p>
            </Card>

            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Video className="h-6 w-6 text-accent" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total de Vídeos</p>
              <p className="text-3xl font-bold">{globalStats.totalVideos}</p>
            </Card>

            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Campeonatos Ativos</p>
              <p className="text-3xl font-bold">{activeCampaigns.length}</p>
            </Card>

            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Campeonatos</p>
              <p className="text-3xl font-bold">{globalStats.totalCampaigns}</p>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Suas Views Totais</p>
              <p className="text-3xl font-bold text-glow">
                {userStats.totalViews.toLocaleString()}
              </p>
            </Card>

            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Video className="h-6 w-6 text-accent" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Vídeos Enviados</p>
              <p className="text-3xl font-bold">{userStats.totalVideos}</p>
            </Card>

            <Card className="glass-card hover-glow p-6 animate-slide-up neon-border" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Participando</p>
              <p className="text-3xl font-bold">{userStats.participatingCampaigns} campeonatos</p>
            </Card>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mb-12 flex gap-4">
            <Button 
              onClick={() => navigate("/create-campaign")} 
              className="bg-gradient-primary hover:opacity-90"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Campeonato
            </Button>
            <Button 
              onClick={() => navigate("/video-analytics")} 
              variant="outline"
              className="neon-border"
              size="lg"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Ver Analytics
            </Button>
            <Button 
              onClick={() => navigate("/manage-videos")} 
              variant="outline"
              className="neon-border"
              size="lg"
            >
              <Video className="h-5 w-5 mr-2" />
              Gestão de Vídeos
            </Button>
          </div>
        )}

        {/* Active Campaigns */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-glow">Campeonatos Ativos</h3>
            {!isAdmin && (
              <Button onClick={() => navigate("/campaigns")} variant="ghost">
                Ver Todos
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCampaigns.map((campaign, index) => (
              <Card
                key={campaign.id}
                className="glass-card hover-glow p-6 animate-scale-in cursor-pointer group"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/campaign/${campaign.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">
                    {campaign.platform === "instagram" ? "📸" : "🎵"}
                  </span>
                  <Badge className="bg-success">Ativo</Badge>
                </div>

                <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {campaign.name}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {campaign.description}
                </p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Até {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>

                {campaign.prize_description && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-semibold text-primary">🏆 {campaign.prize_description}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {activeCampaigns.length === 0 && (
            <Card className="glass-card p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-xl text-muted-foreground">
                Nenhum campeonato ativo no momento
              </p>
            </Card>
          )}
        </div>

        {/* Portfolio - Ended Campaigns */}
        {endedCampaigns.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-glow">Portfolio - Campeonatos Encerrados</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {endedCampaigns.map((campaign, index) => (
                <Card
                  key={campaign.id}
                  className="glass-card hover-glow p-6 animate-scale-in cursor-pointer group opacity-75 hover:opacity-100 transition-opacity"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl grayscale">
                      {campaign.platform === "instagram" ? "📸" : "🎵"}
                    </span>
                    <Badge className="bg-muted">Encerrado</Badge>
                  </div>

                  <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {campaign.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {campaign.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Encerrado em {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Index() {
  return (
    <ProtectedRoute>
      <IndexContent />
    </ProtectedRoute>
  );
}
