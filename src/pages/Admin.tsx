import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Users,
  Trophy,
  Video,
  Plus,
  DollarSign,
  Shield,
  UserCheck,
  UserX,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  LayoutDashboard,
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

interface AdminUser {
  id: string;
  email: string;
  username: string;
  status: string;
  role: 'admin' | 'client' | 'user';
  warning: string;
  date: string;
}

export default function Admin() {
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAdminData();
    fetchUsers();
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true);

      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*");

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

      const externalVideos = await externalSupabase.getSocialVideos();
      const externalViews = externalVideos?.reduce(
        (sum: number, v: any) => sum + (v.views || 0),
        0
      ) || 0;

      const { data: profiles } = await supabase.from("profiles").select("*");

      const totalViews = totalCampaignViews + externalViews;

      setStats({
        totalVideos: (campaignVideos?.length || 0) + (externalVideos?.length || 0),
        totalUsers: profiles?.length || 0,
        activeCampaigns: campaigns?.length || 0,
        totalViews,
      });

      const dailyGrowthData = await externalSupabase.getDailyGrowth(30);
      
      const formattedGrowthData = dailyGrowthData.map((day) => ({
        date: new Date(day.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        videos: day.total_posts,
        views: day.total_views,
      }));
      
      setGrowthData(formattedGrowthData);

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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_users_view');
      
      if (error) throw error;
      
      // Remove duplicatas usando um Map (mantém apenas a primeira ocorrência de cada user_id)
      const uniqueUsers = Array.from(
        new Map((data || []).map(user => [user.id, user])).values()
      );
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: { pendingId: userId }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast.success('Usuário aprovado com sucesso!');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar usuário');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('reject_user', { pending_id: userId });
      if (error) throw error;
      
      toast.success('Usuário rejeitado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar usuário');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('update_role', { 
        p_user_id: userId, 
        p_new_role: newRole 
      } as any);
      if (error) throw error;
      
      toast.success(`Role atualizada para ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar role');
    }
  };

  const handleUpdateWarning = async (userId: string, newWarning: string) => {
    try {
      const { error } = await supabase.rpc('update_warning', { 
        user_id: userId, 
        new_warning: newWarning 
      });
      if (error) throw error;
      
      toast.success('Advertência atualizada');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar advertência');
    }
  };

  const openConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmDialog({ open: true, title, description, action });
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

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-glow">
                Painel Administrativo
              </h1>
              <p className="text-muted-foreground">
                Gerencie competições, vídeos e usuários
              </p>
            </div>
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

        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-8">
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
          </TabsContent>

          {/* TAB: GERENCIAMENTO DE USUÁRIOS */}
          <TabsContent value="users" className="space-y-8">
            {/* Usuários Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Usuários Pendentes ({pendingUsers.length})
                </CardTitle>
                <CardDescription>Novos usuários aguardando aprovação</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum usuário pendente</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{new Date(user.date).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => 
                                openConfirmDialog(
                                  "Rejeitar Usuário",
                                  `Tem certeza que deseja rejeitar ${user.username}?`,
                                  () => handleReject(user.id)
                                )
                              }
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Usuários Ativos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Usuários Ativos ({activeUsers.length})
                </CardTitle>
                <CardDescription>Gerenciar usuários aprovados do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.warning === 'warning' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Advertido
                            </Badge>
                          )}
                          {user.warning === 'suspension' && (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Suspenso
                            </Badge>
                          )}
                          {user.status === 'banned' && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Banido
                            </Badge>
                          )}
                          {user.warning === 'none' && user.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(user.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {user.role === 'user' && user.status !== 'banned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateRole(user.id, 'admin')}
                                className="text-xs"
                              >
                                ↑ Admin
                              </Button>
                            )}
                            {user.role === 'admin' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => 
                                  openConfirmDialog(
                                    "Remover Admin",
                                    `Deseja remover privilégios de admin de ${user.username}?`,
                                    () => handleUpdateRole(user.id, 'user')
                                  )
                                }
                                className="text-xs"
                              >
                                ↓ User
                              </Button>
                            )}
                            {user.status !== 'banned' && user.warning === 'none' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateWarning(user.id, 'warning')}
                                className="text-xs border-yellow-500 text-yellow-600"
                              >
                                ⚠ Advertir
                              </Button>
                            )}
                            {user.warning === 'warning' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => 
                                  openConfirmDialog(
                                    "Suspender Usuário",
                                    `Deseja suspender ${user.username}?`,
                                    () => handleUpdateWarning(user.id, 'suspension')
                                  )
                                }
                                className="text-xs border-orange-500 text-orange-600"
                              >
                                🔒 Suspender
                              </Button>
                            )}
                            {(user.warning === 'warning' || user.warning === 'suspension') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateWarning(user.id, 'none')}
                                className="text-xs border-green-500 text-green-600"
                              >
                                ✓ Limpar
                              </Button>
                            )}
                            {user.status !== 'banned' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => 
                                  openConfirmDialog(
                                    "Banir Usuário",
                                    `ATENÇÃO: Deseja banir permanentemente ${user.username}?`,
                                    () => handleUpdateRole(user.id, 'banned')
                                  )
                                }
                                className="text-xs"
                              >
                                🚫 Banir
                              </Button>
                            )}
                            {user.status === 'banned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateRole(user.id, 'user')}
                                className="text-xs border-green-500 text-green-600"
                              >
                                ✓ Desbanir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
