import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase, UnifiedPost, PlatformInsight } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Eye,
  DollarSign,
  Trophy,
  TrendingUp,
  Upload,
  Wallet,
  User,
  Video,
  Target,
  ArrowRight,
  Instagram,
  Music,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalEarnings: 0,
    totalVideosSubmitted: 0,
    activeCampaigns: 0,
    submittedPosts: 0,
  });
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<UnifiedPost[]>([]);
  const [mostViewedPost, setMostViewedPost] = useState<UnifiedPost | null>(null);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Buscar vídeos submetidos pelo usuário
      const { data: userVideos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("submitted_by", user?.id);

      // Buscar competições ativas
      const { data: activeCampaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true);

      // Buscar métricas reais dos vídeos do usuário
      let totalViews = 0;
      if (userVideos && userVideos.length > 0) {
        const [allInstagramVideos, allTikTokVideos] = await Promise.all([
          externalSupabase.getAllVideos(),
          externalSupabase.getSocialVideos(),
        ]);

        const viewsPromises = userVideos.map(async (video) => {
          try {
            if (video.platform === "instagram") {
              const match = allInstagramVideos.find((v) => v.link === video.video_link);
              return match?.views || 0;
            } else if (video.platform === "tiktok") {
              // Extrair video_id do link
              const videoIdMatch = video.video_link.match(/\/video\/(\d+)/);
              const videoId = videoIdMatch ? videoIdMatch[1] : null;
              
              if (videoId) {
                // Buscar considerando o "=" no início do video_id
                const match = allTikTokVideos.find((v) => v.video_id === videoId || v.video_id === `=${videoId}`);
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

      // Buscar latest posts
      const latest = await externalSupabase.getLatestPosts(5);
      setLatestPosts(latest);

      // Buscar most viewed post
      const mostViewed = await externalSupabase.getMostViewedPost();
      setMostViewedPost(mostViewed);

      // Buscar platform insights
      const platformInsights = await externalSupabase.getPlatformInsights();

      // Buscar daily growth para o gráfico
      const dailyGrowth = await externalSupabase.getDailyGrowth(7);

      // Contar total de vídeos (Instagram + TikTok)
      const [instagramVideos, tiktokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);
      
      const totalVideosInDB = (instagramVideos?.length || 0) + (tiktokVideos?.length || 0);

      // Mock earnings calculation (R$ 0.01 per 1000 views)
      const totalEarnings = (totalViews / 1000) * 0.01;

      setStats({
        totalViews,
        totalEarnings,
        totalVideosSubmitted: userVideos?.length || 0,
        activeCampaigns: activeCampaigns?.length || 0,
        submittedPosts: userVideos?.length || 0,
      });

      // Formatar evolution data do daily growth
      const evolution = dailyGrowth.map((day) => ({
        date: new Date(day.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        views: day.total_views,
        instagram: day.instagram_views,
        tiktok: day.tiktok_views,
      }));
      setEvolutionData(evolution);

      // Formatar platform data dos insights
      const platforms = platformInsights.map((insight, index) => ({
        name: insight.platform === "instagram" ? "Instagram" : "TikTok",
        value: insight.total_posts,
        views: insight.total_views,
        color: index === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))",
      }));
      setPlatformData(platforms);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta! Aqui está seu desempenho
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total de Views"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
          />
          <StatCard
            title="Total Ganho"
            value={`R$ ${stats.totalEarnings.toFixed(2)}`}
            icon={DollarSign}
          />
          <StatCard
            title="Vídeos no Sistema"
            value={stats.totalVideosSubmitted}
            icon={Video}
          />
          <StatCard
            title="Competições Ativas"
            value={stats.activeCampaigns}
            icon={Target}
          />
          <StatCard
            title="Seus Envios"
            value={stats.submittedPosts}
            icon={Upload}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolution Chart */}
          <ChartCard
            title="Evolução Diária"
            subtitle="Views dos últimos 7 dias"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  name="Total Views"
                />
                <Line
                  type="monotone"
                  dataKey="instagram"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
                  name="Instagram"
                />
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2 }}
                  name="TikTok"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Platform Distribution */}
          <ChartCard
            title="Desempenho por Plataforma"
            subtitle="Distribuição de views"
          >
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {platformData.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{platform.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {platform.views.toLocaleString()} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Latest Posts */}
        {latestPosts.length > 0 && (
          <Card className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Posts Recentes</h3>
                <p className="text-sm text-muted-foreground">
                  Últimos vídeos adicionados ao sistema
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestPosts.map((post) => (
                <Card key={post.id} className="glass-card-hover p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {post.platform === "instagram" ? (
                      <Instagram className="h-5 w-5 text-primary" />
                    ) : (
                      <Music className="h-5 w-5 text-primary" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post.platform}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Views</span>
                      <span className="text-sm font-semibold">
                        {post.views.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Likes</span>
                      <span className="text-sm font-semibold">
                        {post.likes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block mt-3"
                  >
                    Ver post
                  </a>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Most Viewed Post */}
        {mostViewedPost && (
          <Card className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Post Mais Viral</h3>
                <p className="text-sm text-muted-foreground">
                  O vídeo com melhor desempenho no sistema
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {mostViewedPost.views?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {mostViewedPost.likes?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mostViewedPost.platform === "instagram" ? (
                  <Instagram className="h-4 w-4 text-primary" />
                ) : (
                  <Music className="h-4 w-4 text-primary" />
                )}
                <div>
                  <p className="text-sm font-semibold">{mostViewedPost.platform}</p>
                  <p className="text-xs text-muted-foreground">Plataforma</p>
                </div>
              </div>
              <div className="flex items-center">
                <a
                  href={mostViewedPost.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver post →
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            onClick={() => navigate("/campaigns")}
          >
            <Trophy className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Competições</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Veja suas competições ativas e históricas
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Competições
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            style={{ animationDelay: "0.1s" }}
            onClick={() => navigate("/account-analytics")}
          >
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Métricas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Acompanhe suas contas e métricas
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Métricas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            style={{ animationDelay: "0.2s" }}
            onClick={() => navigate("/profile")}
          >
            <User className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Perfil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Edite suas informações e configurações
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Perfil
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
