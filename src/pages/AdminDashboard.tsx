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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Users,
  Trophy,
  Video,
  Plus,
  Settings,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalViews: 0,
  });
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAdminData();
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      // Get campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true);

      // Get campaign videos
      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*");

      // Get external videos
      const externalVideos = await externalSupabase.getSocialVideos();

      // Get users
      const { data: profiles } = await supabase.from("profiles").select("*");

      const totalViews =
        (campaignVideos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0) +
        (externalVideos?.reduce(
          (sum: number, v: any) => sum + (v.views || 0),
          0
        ) || 0);

      setStats({
        totalVideos: (campaignVideos?.length || 0) + (externalVideos?.length || 0),
        totalUsers: profiles?.length || 0,
        activeCampaigns: campaigns?.length || 0,
        totalViews,
      });

      // Generate growth data (last 30 days)
      const growthData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          videos: Math.floor(Math.random() * 20) + 5,
          views: Math.floor(Math.random() * 10000) + 2000,
        };
      });
      setGrowthData(growthData);

      // Get top users by views
      const userStats = new Map();
      campaignVideos?.forEach((video) => {
        const userId = video.submitted_by;
        if (userId) {
          const current = userStats.get(userId) || { views: 0, videos: 0 };
          userStats.set(userId, {
            views: current.views + (video.views || 0),
            videos: current.videos + 1,
          });
        }
      });

      const topUsersArray = Array.from(userStats.entries())
        .map(([userId, stats]) => ({
          userId,
          views: stats.views,
          videos: stats.videos,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setTopUsers(topUsersArray);
    } catch (error) {
      console.error("Error fetching admin data:", error);
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
            <h1 className="text-3xl font-bold text-glow mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie competições, vídeos e usuários
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/videos")}
            >
              <Video className="h-4 w-4 mr-2" />
              Gerenciar Vídeos
            </Button>
            <Button
              className="premium-gradient"
              onClick={() => navigate("/admin/create-campaign")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Competição
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Vídeos"
            value={stats.totalVideos.toLocaleString()}
            icon={Video}
            trend={{ value: "23.5%", isPositive: true }}
          />
          <StatCard
            title="Usuários Ativos"
            value={stats.totalUsers}
            icon={Users}
            trend={{ value: "12.3%", isPositive: true }}
          />
          <StatCard
            title="Competições Ativas"
            value={stats.activeCampaigns}
            icon={Trophy}
          />
          <StatCard
            title="Views Totais"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
            trend={{ value: "45.8%", isPositive: true }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Videos Growth */}
          <ChartCard
            title="Crescimento de Vídeos"
            subtitle="Últimos 30 dias"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthData}>
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
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Views Growth */}
          <ChartCard title="Crescimento de Views" subtitle="Últimos 30 dias">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
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
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top Users Table */}
        <Card className="glass-card">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Top Usuários</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ranking por total de views
              </p>
            </div>
            <Button variant="outline" size="sm">
              Ver Todos
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Vídeos</TableHead>
                <TableHead className="text-right">Views Totais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.map((user, index) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-primary text-primary-foreground"
                          : index === 1
                          ? "bg-accent text-accent-foreground"
                          : index === 2
                          ? "bg-warning text-warning-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    Usuário #{user.userId.slice(0, 8)}
                  </TableCell>
                  <TableCell>{user.videos}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {user.views.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="glass-card-hover p-6 cursor-pointer"
            onClick={() => navigate("/campaigns")}
          >
            <Trophy className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Gerenciar Competições</h3>
            <p className="text-sm text-muted-foreground">
              Editar, pausar ou encerrar competições
            </p>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer"
            onClick={() => navigate("/admin/videos")}
          >
            <Video className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Aprovar Vídeos</h3>
            <p className="text-sm text-muted-foreground">
              Verificar e aprovar vídeos enviados
            </p>
          </Card>

          <Card className="glass-card-hover p-6 cursor-pointer">
            <DollarSign className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Financeiro</h3>
            <p className="text-sm text-muted-foreground">
              Gerenciar prêmios e pagamentos
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
