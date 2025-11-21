import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
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
    averageRank: 0,
    activeCampaigns: 0,
    submittedPosts: 0,
  });
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [topVideo, setTopVideo] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Get user's submitted videos
      const { data: userVideos } = await supabase
        .from("campaign_videos")
        .select("*, campaigns(*)")
        .eq("submitted_by", user?.id);

      // Get active campaigns
      const { data: activeCampaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true);

      // Get external videos
      const externalVideos = await externalSupabase.getSocialVideos();

      // Calculate stats
      const totalViews =
        (userVideos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0) +
        (externalVideos?.reduce((sum: number, v: any) => sum + (v.views || 0), 0) || 0);

      // Mock earnings calculation (R$ 0.01 per 1000 views)
      const totalEarnings = (totalViews / 1000) * 0.01;

      setStats({
        totalViews,
        totalEarnings,
        averageRank: userVideos && userVideos.length > 0 ? 3 : 0,
        activeCampaigns: activeCampaigns?.length || 0,
        submittedPosts: (userVideos?.length || 0) + (externalVideos?.length || 0),
      });

      // Generate evolution data (last 7 days)
      const evolutionData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          views: Math.floor(Math.random() * 5000) + 1000,
          er: (Math.random() * 10 + 2).toFixed(1),
        };
      });
      setEvolutionData(evolutionData);

      // Platform distribution
      const platforms = [
        { name: "TikTok", value: 45, color: "hsl(var(--primary))" },
        { name: "Instagram", value: 35, color: "hsl(var(--accent))" },
        { name: "YouTube", value: 15, color: "hsl(var(--chart-4))" },
        { name: "Kwai", value: 5, color: "hsl(var(--chart-5))" },
      ];
      setPlatformData(platforms);

      // Top performing video
      if (userVideos && userVideos.length > 0) {
        const top = userVideos.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
        setTopVideo(top);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
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
        {/* Header */}
        <div className="flex items-center justify-between">
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
            trend={{ value: "12.5%", isPositive: true }}
          />
          <StatCard
            title="Total Ganho"
            value={`R$ ${stats.totalEarnings.toFixed(2)}`}
            icon={DollarSign}
            trend={{ value: "8.3%", isPositive: true }}
          />
          <StatCard
            title="Ranking Médio"
            value={stats.averageRank > 0 ? `#${stats.averageRank}` : "-"}
            subtitle="nas competições"
            icon={Trophy}
          />
          <StatCard
            title="Competições Ativas"
            value={stats.activeCampaigns}
            icon={Target}
          />
          <StatCard
            title="Posts Enviados"
            value={stats.submittedPosts}
            icon={Video}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolution Chart */}
          <ChartCard
            title="Evolução Diária"
            subtitle="Views e Engajamento nos últimos 7 dias"
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
                  <span className="text-sm">
                    {platform.name} ({platform.value}%)
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="glass-card-hover p-6 cursor-pointer"
            onClick={() => navigate("/submit")}
          >
            <Upload className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Enviar Post</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Participe das competições enviando seus vídeos
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Enviar Agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer"
            onClick={() => navigate("/campaigns")}
          >
            <Trophy className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Rankings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Veja sua posição nas competições ativas
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Rankings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer"
            onClick={() => navigate("/wallet")}
          >
            <Wallet className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Carteira</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie seus ganhos e solicite saques
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Acessar Carteira
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer"
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

        {/* Top Video */}
        {topVideo && (
          <Card className="glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Post Mais Viral</h3>
                <p className="text-sm text-muted-foreground">
                  Seu vídeo com melhor desempenho
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {topVideo.views?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {topVideo.likes?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </div>
              <div className="col-span-2">
                <a
                  href={topVideo.video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate block"
                >
                  {topVideo.video_link}
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  Campanha: {topVideo.campaigns?.name}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
