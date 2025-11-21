import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Eye,
  Video,
  Trophy,
  TrendingUp,
  Calendar,
  Users,
  Plus,
} from "lucide-react";
import { externalSupabase } from "@/lib/externalSupabase";

export default function Dashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalViews: 0,
    totalVideos: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/campaigns");
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      // Fetch external videos stats (Instagram + TikTok)
      const [instagramVideos, tiktokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      const totalViews = [...instagramVideos, ...tiktokVideos].reduce(
        (sum, video) => sum + (video.views || 0),
        0
      );
      const totalVideos = instagramVideos.length + tiktokVideos.length;

      // Fetch campaigns stats
      const { data: campaigns } = await supabase.from("campaigns").select("*");

      setStats({
        totalViews,
        totalVideos,
        totalCampaigns: campaigns?.length || 0,
        activeCampaigns: campaigns?.filter((c) => c.is_active).length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
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

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary animate-float" />
            <h1 className="text-2xl font-bold text-glow">Dashboard Admin</h1>
          </div>
          <nav className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/campaigns")}>Campeonatos</Button>
            <Button variant="ghost" onClick={() => navigate("/video-analytics")}>
              Analytics
            </Button>
            <Button onClick={() => navigate("/create-campaign")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Campeonato
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 animate-fade-in text-glow">
            Visão Geral da Plataforma
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card p-6 animate-slide-up neon-border">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total de Views</p>
              <p className="text-3xl font-bold text-glow">
                {(stats.totalViews / 1000000).toFixed(1)}M
              </p>
            </Card>

            <Card className="glass-card p-6 animate-slide-up neon-border" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Video className="h-6 w-6 text-accent" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total de Vídeos</p>
              <p className="text-3xl font-bold">{stats.totalVideos}</p>
            </Card>

            <Card className="glass-card p-6 animate-slide-up neon-border" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Campeonatos Ativos</p>
              <p className="text-3xl font-bold">{stats.activeCampaigns}</p>
            </Card>

            <Card className="glass-card p-6 animate-slide-up neon-border" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Campeonatos</p>
              <p className="text-3xl font-bold">{stats.totalCampaigns}</p>
            </Card>
          </div>
        </div>

        {/* Detailed Analytics */}
        <Card className="glass-card p-6 animate-fade-in">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="campaigns">Campeonatos</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Resumo Executivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 bg-secondary/50">
                    <h4 className="font-semibold mb-2">Engajamento Total</h4>
                    <p className="text-2xl font-bold text-primary">
                      {((stats.totalViews / stats.totalVideos) || 0).toFixed(0)} views/vídeo
                    </p>
                  </Card>
                  <Card className="p-4 bg-secondary/50">
                    <h4 className="font-semibold mb-2">Vídeos por Campeonato</h4>
                    <p className="text-2xl font-bold text-primary">
                      {stats.totalCampaigns > 0 ? (stats.totalVideos / stats.totalCampaigns).toFixed(1) : '0'}
                    </p>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Insights do Cliente</h3>
                <p className="text-muted-foreground">
                  Nossos campeonatos alcançaram mais de {(stats.totalViews / 1000000).toFixed(1)} milhões
                  de visualizações, demonstrando o alto engajamento e alcance da nossa plataforma.
                  Com {stats.totalCampaigns} campeonatos realizados, oferecemos uma solução completa
                  para marcas que buscam visibilidade e engajamento autêntico.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="campaigns">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Gestão de Campeonatos</h3>
                <Button onClick={() => navigate("/create-campaign")} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Campeonato
                </Button>
                <p className="text-muted-foreground mt-4">
                  Gerencie todos os seus campeonatos em um só lugar. Visualize estatísticas,
                  adicione prêmios e acompanhe o desempenho em tempo real.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="performance">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Métricas de Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Média de Views</p>
                    <p className="text-2xl font-bold">
                      {((stats.totalViews / stats.totalVideos) || 0).toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-4 bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Total de Campeonatos</p>
                    <p className="text-2xl font-bold text-success">{stats.totalCampaigns}</p>
                  </Card>
                  <Card className="p-4 bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Campeonatos Ativos</p>
                    <p className="text-2xl font-bold text-primary">{stats.activeCampaigns}</p>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
