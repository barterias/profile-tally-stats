import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import ExpandableStatCard from "@/components/Dashboard/ExpandableStatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SyncMetricsButton } from "@/components/Admin/SyncMetricsButton";
import { AdminSubmitVideoModal } from "@/components/Admin/AdminSubmitVideoModal";
import { useVideoNotifications } from "@/hooks/useVideoNotifications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Users,
  Trophy,
  Video,
  Plus,
  Settings,
  TrendingUp,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
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
import { toast } from "sonner";

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalUsers: 0,
    activeCampaigns: 0,
    totalViews: 0,
  });
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);

  // Enable realtime video notifications for admin
  useVideoNotifications();
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

      // Buscar métricas reais das tabelas externas para os vídeos da campanha
      let totalCampaignViews = 0;
      if (campaignVideos && campaignVideos.length > 0) {
        const metricsPromises = campaignVideos.map(async (video) => {
          try {
            if (video.platform === "instagram") {
              const instagramData = await externalSupabase.getVideoByLink(video.video_link);
              return instagramData?.views || 0;
            } else if (video.platform === "tiktok") {
              const allSocialVideos = await externalSupabase.getSocialVideos();
              const tiktokData = allSocialVideos.find(v => 
                v.video_url?.includes(video.video_link) || 
                video.video_link?.includes(v.video_id || '')
              );
              return tiktokData?.views || 0;
            }
          } catch (error) {
            console.error("Erro ao buscar métricas:", error);
          }
          return 0;
        });
        
        const viewsArray = await Promise.all(metricsPromises);
        totalCampaignViews = viewsArray.reduce((sum, views) => sum + views, 0);
      }

      // Get external videos (TikTok from social_videos)
      const externalVideos = await externalSupabase.getSocialVideos();
      const externalViews = externalVideos?.reduce(
        (sum: number, v: any) => sum + (v.views || 0),
        0
      ) || 0;

      // Get users
      const { data: profiles } = await supabase.from("profiles").select("*");

      const totalViews = totalCampaignViews + externalViews;

      setStats({
        totalVideos: (campaignVideos?.length || 0) + (externalVideos?.length || 0),
        totalUsers: profiles?.length || 0,
        activeCampaigns: campaigns?.length || 0,
        totalViews,
      });

      // Buscar dados reais de crescimento da view daily_growth
      const dailyGrowthData = await externalSupabase.getDailyGrowth(30);
      
      const formattedGrowthData = dailyGrowthData.map((day) => ({
        date: new Date(day.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        videos: day.total_posts,
        views: day.total_views,
      }));
      
      setGrowthData(formattedGrowthData);

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

  const exportToCSV = () => {
    const csvContent = [
      ['Métrica', 'Valor'],
      ['Total de Vídeos', stats.totalVideos.toString()],
      ['Usuários Ativos', stats.totalUsers.toString()],
      ['Competições Ativas', stats.activeCampaigns.toString()],
      ['Views Totais', stats.totalViews.toString()],
      [''],
      ['CRESCIMENTO DIÁRIO'],
      ['Data', 'Vídeos', 'Views'],
      ...growthData.map(d => [d.date, d.videos?.toString() || '0', d.views?.toString() || '0']),
      [''],
      ['TOP USUÁRIOS'],
      ['Posição', 'ID Usuário', 'Vídeos', 'Views'],
      ...topUsers.map((u, i) => [(i + 1).toString(), u.userId?.slice(0, 8), u.videos?.toString(), u.views?.toString()]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-admin-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Relatório CSV exportado com sucesso!');
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor, permita pop-ups para exportar em PDF.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório Administrativo</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #8b5cf6; }
          .header h1 { font-size: 28px; color: #8b5cf6; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 30px 0; }
          .stat-card { text-align: center; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; }
          .stat-card .value { font-size: 28px; font-weight: bold; color: #8b5cf6; }
          .stat-card .label { font-size: 12px; color: #666; margin-top: 5px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; color: #8b5cf6; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f8f9fa; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório Administrativo</h1>
          <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="value">${stats.totalVideos.toLocaleString()}</div><div class="label">Total de Vídeos</div></div>
          <div class="stat-card"><div class="value">${stats.totalUsers}</div><div class="label">Usuários Ativos</div></div>
          <div class="stat-card"><div class="value">${stats.activeCampaigns}</div><div class="label">Competições Ativas</div></div>
          <div class="stat-card"><div class="value">${stats.totalViews.toLocaleString()}</div><div class="label">Views Totais</div></div>
        </div>
        <div class="section">
          <h2 class="section-title">🏆 Top Usuários</h2>
          <table>
            <thead><tr><th>#</th><th>Usuário</th><th>Vídeos</th><th>Views</th></tr></thead>
            <tbody>
              ${topUsers.map((u, i) => `<tr><td>${i + 1}º</td><td>Usuário #${u.userId?.slice(0, 8)}</td><td>${u.videos}</td><td>${u.views?.toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="footer">Relatório gerado automaticamente</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Relatório PDF gerado!');
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
      <AdminSubmitVideoModal
        open={showAddVideoModal}
        onOpenChange={setShowAddVideoModal}
        onSuccess={fetchAdminData}
      />
      
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie competições, vídeos e usuários
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SyncMetricsButton />
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar CSV (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              onClick={() => setShowAddVideoModal(true)}
            >
              <Video className="h-4 w-4 mr-2" />
              Adicionar Vídeo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/videos")}
            >
              <Settings className="h-4 w-4 mr-2" />
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExpandableStatCard
            title="Total de Vídeos"
            value={stats.totalVideos.toLocaleString()}
            icon={Video}
            trend={{ value: "23.5%", isPositive: true }}
            blobVariant={1}
            details={
              <p className="text-sm text-muted-foreground">
                Vídeos de todas as plataformas monitoradas
              </p>
            }
          />
          <ExpandableStatCard
            title="Usuários Ativos"
            value={stats.totalUsers}
            icon={Users}
            trend={{ value: "12.3%", isPositive: true }}
            blobVariant={2}
            details={
              <p className="text-sm text-muted-foreground">
                Clippers cadastrados na plataforma
              </p>
            }
          />
          <ExpandableStatCard
            title="Competições Ativas"
            value={stats.activeCampaigns}
            icon={Trophy}
            blobVariant={3}
            details={
              <p className="text-sm text-muted-foreground">
                Campanhas em andamento
              </p>
            }
          />
          <ExpandableStatCard
            title="Views Totais"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
            trend={{ value: "45.8%", isPositive: true }}
            blobVariant={4}
            details={
              <p className="text-sm text-muted-foreground">
                Soma de todas as visualizações
              </p>
            }
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
