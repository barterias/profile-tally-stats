import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import AdminStatsGrid from "@/components/Admin/AdminStatsGrid";
import PendingItemsCard from "@/components/Admin/PendingItemsCard";
import TopRankingCard from "@/components/Admin/TopRankingCard";
import QuickActionsGrid from "@/components/Admin/QuickActionsGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Users,
  Video,
  Trophy,
  DollarSign,
  Eye,
  UserCheck,
  FileVideo,
  Wallet,
  Plus,
  Settings,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalUsers: number;
  totalVideos: number;
  activeCampaigns: number;
  totalViews: number;
  pendingUsers: number;
  pendingVideos: number;
}

interface PendingUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

interface PendingVideo {
  id: string;
  video_link: string;
  platform: string;
  submitted_by: string;
  submitted_at: string;
  username?: string;
}

interface TopClipper {
  id: string;
  name: string;
  username: string;
  views: number;
  videos: number;
}

function AdminDashboardContent() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalVideos: 0,
    activeCampaigns: 0,
    totalViews: 0,
    pendingUsers: 0,
    pendingVideos: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);
  const [topClippers, setTopClippers] = useState<TopClipper[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchDashboardData();
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel - same approach as Dashboard.tsx
      const [campaignsRes, videosRes, profilesRes, pendingUsersRes, externalVideos, socialVideos] = await Promise.all([
        supabase.from("campaigns").select("*").eq("is_active", true),
        supabase.from("campaign_videos").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("pending_users").select("*"),
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      // Calculate total views from ALL external videos (same as Dashboard.tsx)
      const allExternalVideos = [...externalVideos, ...socialVideos];
      const totalViews = allExternalVideos.reduce(
        (sum, video) => sum + (video.views || 0),
        0
      );
      const totalExternalVideos = allExternalVideos.length;

      const unverifiedVideos = videosRes.data?.filter((v) => !v.verified) || [];

      // Calculate top clippers using external video metrics
      const normalizeLink = (link: string | undefined | null): string => {
        if (!link) return "";
        let normalized = link.split("?")[0];
        normalized = normalized.replace(/\/$/, "");
        normalized = normalized.toLowerCase();
        return normalized;
      };

      const metricsMap = new Map<string, number>();
      for (const video of allExternalVideos) {
        const link = normalizeLink(video.link || video.video_url);
        if (link) {
          metricsMap.set(link, video.views || 0);
        }
      }

      const userStats = new Map();
      videosRes.data?.forEach((video) => {
        const normalized = normalizeLink(video.video_link);
        const videoViews = metricsMap.get(normalized) || video.views || 0;

        const userId = video.submitted_by;
        if (userId) {
          const current = userStats.get(userId) || { views: 0, videos: 0 };
          userStats.set(userId, {
            views: current.views + videoViews,
            videos: current.videos + 1,
          });
        }
      });

      const topClippersData = Array.from(userStats.entries())
        .map(([id, stats]) => {
          const profile = profilesRes.data?.find((p) => p.id === id);
          return {
            id,
            name: profile?.username || `User ${id.slice(0, 8)}`,
            username: profile?.username || id.slice(0, 8),
            views: stats.views,
            videos: stats.videos,
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Enrich pending videos with usernames
      const enrichedPendingVideos = unverifiedVideos.slice(0, 10).map((video) => {
        const profile = profilesRes.data?.find((p) => p.id === video.submitted_by);
        return {
          id: video.id,
          video_link: video.video_link,
          platform: video.platform,
          submitted_by: video.submitted_by || "",
          submitted_at: video.submitted_at,
          username: profile?.username || "Usuário",
        };
      });

      setStats({
        totalUsers: profilesRes.data?.length || 0,
        totalVideos: (videosRes.data?.length || 0) + totalExternalVideos,
        activeCampaigns: campaignsRes.data?.length || 0,
        totalViews,
        pendingUsers: pendingUsersRes.data?.length || 0,
        pendingVideos: unverifiedVideos.length,
      });

      setPendingUsers(pendingUsersRes.data || []);
      setPendingVideos(enrichedPendingVideos);
      setTopClippers(topClippersData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const exportRankingCSV = () => {
    const headers = ["Posição", "Nome", "Username", "Views", "Vídeos"];
    const rows = topClippers.map((clipper, index) => [
      index + 1,
      clipper.name,
      clipper.username,
      clipper.views,
      clipper.videos,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ranking_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Ranking exportado com sucesso!");
  };

  const quickActions = [
    {
      title: "Nova Campanha",
      description: "Criar nova competição",
      icon: Plus,
      variant: "primary" as const,
      onClick: () => navigate("/admin/create-campaign"),
    },
    {
      title: "Usuários",
      description: "Gerenciar participantes",
      icon: Users,
      badge: stats.pendingUsers,
      onClick: () => navigate("/admin/users"),
    },
    {
      title: "Vídeos",
      description: "Aprovar submissões",
      icon: Video,
      badge: stats.pendingVideos,
      onClick: () => navigate("/admin/videos"),
    },
    {
      title: "Campanhas",
      description: "Ver todas campanhas",
      icon: Trophy,
      onClick: () => navigate("/admin/campaigns"),
    },
    {
      title: "Estatísticas",
      description: "Relatórios detalhados",
      icon: BarChart3,
      onClick: () => navigate("/admin/stats"),
    },
    {
      title: "Ranking",
      description: "Ver ranking completo",
      icon: Trophy,
      onClick: () => navigate("/ranking"),
    },
    {
      title: "Submissões",
      description: "Revisar vídeos",
      icon: FileVideo,
      badge: stats.pendingVideos,
      onClick: () => navigate("/admin/submissions"),
    },
    {
      title: "Configurações",
      description: "Ajustes do sistema",
      icon: Settings,
      onClick: () => navigate("/admin/settings"),
    },
  ];

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
          <div className="p-2 rounded-xl bg-primary/15">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral do sistema de campeonatos
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <AdminStatsGrid
          stats={[
            {
              title: "Usuários",
              value: stats.totalUsers,
              icon: Users,
              trend: { value: "12%", isPositive: true },
            },
            {
              title: "Vídeos",
              value: stats.totalVideos,
              icon: Video,
              trend: { value: "8%", isPositive: true },
            },
            {
              title: "Campanhas Ativas",
              value: stats.activeCampaigns,
              icon: Trophy,
            },
            {
              title: "Views Totais",
              value: stats.totalViews.toLocaleString("pt-BR"),
              icon: Eye,
              trend: { value: "23%", isPositive: true },
            },
          ]}
        />

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <QuickActionsGrid actions={quickActions} />
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Items Column */}
          <div className="space-y-4">
            <PendingItemsCard
              title="Usuários Pendentes"
              icon={UserCheck}
              items={pendingUsers.map((u) => ({
                id: u.id,
                title: u.username,
                subtitle: u.email,
                badge: "Aguardando",
                badgeVariant: "secondary",
                timestamp: format(new Date(u.created_at || new Date()), "dd/MM", { locale: ptBR }),
              }))}
              emptyMessage="Nenhum usuário aguardando aprovação"
              onViewAll={() => navigate("/admin/users")}
            />

            <PendingItemsCard
              title="Vídeos Pendentes"
              icon={FileVideo}
              items={pendingVideos.map((v) => ({
                id: v.id,
                title: v.username || "Usuário",
                subtitle: `${v.platform} - ${v.video_link.slice(0, 30)}...`,
                badge: v.platform,
                badgeVariant: "outline",
                timestamp: format(new Date(v.submitted_at), "dd/MM HH:mm", { locale: ptBR }),
              }))}
              emptyMessage="Nenhum vídeo pendente de verificação"
              onViewAll={() => navigate("/admin/submissions")}
            />
          </div>

          {/* Ranking Column */}
          <div className="space-y-4">
            <TopRankingCard
              title="Top 10 Clipadores"
              items={topClippers}
              onExport={exportRankingCSV}
              onViewAll={() => navigate("/ranking")}
            />

            {/* Summary Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-success/15">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                  <CardTitle className="text-base font-semibold">Resumo Geral</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                    <p className="text-xl font-bold text-warning">
                      {stats.pendingUsers + stats.pendingVideos}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Campanhas</p>
                    <p className="text-xl font-bold text-primary">{stats.activeCampaigns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function AdminDashboardNew() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
