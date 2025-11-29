import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  BarChart3,
  Eye,
  Users,
  Trophy,
  Video,
  TrendingUp,
  Instagram,
  Music,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

function AdminStatsContent() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalViews: 0,
    instagramVideos: 0,
    tiktokVideos: 0,
    avgViewsPerVideo: 0,
  });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchStats();
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      // Buscar campanhas
      const { data: campaigns } = await supabase.from("campaigns").select("*");
      const activeCampaigns = campaigns?.filter((c) => c.is_active) || [];

      // Buscar vídeos de campanhas
      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*");

      // Buscar usuários
      const { data: profiles } = await supabase.from("profiles").select("*");

      // Buscar dados externos
      const [instagramVideos, tiktokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      const totalVideos =
        (campaignVideos?.length || 0) +
        (instagramVideos?.length || 0) +
        (tiktokVideos?.length || 0);

      const instagramViews = instagramVideos?.reduce(
        (sum, v) => sum + (v.views || 0),
        0
      ) || 0;
      const tiktokViews = tiktokVideos?.reduce(
        (sum, v) => sum + (v.views || 0),
        0
      ) || 0;
      const totalViews = instagramViews + tiktokViews;

      setStats({
        totalVideos,
        totalUsers: profiles?.length || 0,
        activeCampaigns: activeCampaigns.length,
        totalViews,
        instagramVideos: instagramVideos?.length || 0,
        tiktokVideos: tiktokVideos?.length || 0,
        avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
      });

      // Platform data
      setPlatformData([
        {
          name: "Instagram",
          value: instagramVideos?.length || 0,
          views: instagramViews,
          color: "hsl(var(--primary))",
        },
        {
          name: "TikTok",
          value: tiktokVideos?.length || 0,
          views: tiktokViews,
          color: "hsl(var(--accent))",
        },
      ]);

      // Daily growth
      const dailyGrowth = await externalSupabase.getDailyGrowth(30);
      const formattedGrowth = dailyGrowth.map((day) => ({
        date: new Date(day.date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
        videos: day.total_posts,
        views: day.total_views,
        instagram: day.instagram_views,
        tiktok: day.tiktok_views,
      }));
      setGrowthData(formattedGrowth);

      // Campaign stats
      const campaignWithStats = await Promise.all(
        (campaigns || []).slice(0, 5).map(async (campaign) => {
          const { data: videos } = await supabase
            .from("campaign_videos")
            .select("*")
            .eq("campaign_id", campaign.id);

          const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;
          const participants = new Set(videos?.map((v) => v.submitted_by)).size;

          return {
            name: campaign.name.slice(0, 20),
            videos: videos?.length || 0,
            views: totalViews,
            participants,
            active: campaign.is_active,
          };
        })
      );
      setCampaignStats(campaignWithStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-glow">Estatísticas Gerais</h1>
            <p className="text-muted-foreground">
              Visão completa do desempenho da plataforma
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            title="Total de Vídeos"
            value={stats.totalVideos.toLocaleString()}
            icon={Video}
          />
          <StatCard
            title="Views Totais"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
          />
          <StatCard
            title="Usuários"
            value={stats.totalUsers}
            icon={Users}
          />
          <StatCard
            title="Campanhas Ativas"
            value={stats.activeCampaigns}
            icon={Trophy}
          />
          <StatCard
            title="Instagram"
            value={stats.instagramVideos}
            icon={Instagram}
          />
          <StatCard
            title="TikTok"
            value={stats.tiktokVideos}
            icon={Music}
          />
          <StatCard
            title="Média Views"
            value={stats.avgViewsPerVideo.toLocaleString()}
            icon={TrendingUp}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Crescimento de Views" subtitle="Últimos 30 dias">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribuição por Plataforma" subtitle="Vídeos e views">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
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
                <p className="text-center text-sm text-muted-foreground">
                  Total de Vídeos
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4">
                {platformData.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: platform.color }}
                    />
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {platform.value} vídeos • {platform.views.toLocaleString()} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Views por Plataforma" subtitle="Comparativo diário">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                  dataKey="instagram"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Instagram"
                />
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  name="TikTok"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Desempenho por Campanha" subtitle="Top 5 campanhas">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Vídeos" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Campaign Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Resumo de Campanhas
            </CardTitle>
            <CardDescription>
              Performance detalhada de cada campanha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignStats.map((campaign, index) => (
                <Card
                  key={index}
                  className={`p-4 ${
                    campaign.active
                      ? "border-primary/30 bg-primary/5"
                      : "bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold truncate">{campaign.name}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        campaign.active
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {campaign.active ? "Ativa" : "Encerrada"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{campaign.videos}</p>
                      <p className="text-xs text-muted-foreground">Vídeos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{campaign.participants}</p>
                      <p className="text-xs text-muted-foreground">Participantes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {campaign.views > 1000
                          ? `${(campaign.views / 1000).toFixed(1)}k`
                          : campaign.views}
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function AdminStats() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminStatsContent />
    </ProtectedRoute>
  );
}
