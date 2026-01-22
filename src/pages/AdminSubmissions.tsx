import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ExternalLink,
  FileVideo,
  Download,
  RefreshCw,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { useVideoNotifications } from "@/hooks/useVideoNotifications";

interface VideoSubmission {
  id: string;
  user_id: string;
  username?: string;
  campaign_id: string;
  campaign_name?: string;
  platform: string;
  video_link: string;
  verified: boolean;
  views: number;
  submitted_at: string;
}

function AdminSubmissionsContent() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant?: "default" | "destructive";
  }>({ open: false, title: "", description: "", action: () => {}, variant: "default" });

  // Notificações em tempo real
  useVideoNotifications();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const { data: videosData, error } = await supabase
        .from("campaign_videos")
        .select("*, campaigns(name)")
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((videosData || []).map((v) => v.submitted_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);

      const enrichedData: VideoSubmission[] = (videosData || []).map((v: any) => ({
        id: v.id,
        user_id: v.submitted_by || "",
        username: profileMap.get(v.submitted_by) || t("submissions.unknown_user"),
        campaign_id: v.campaign_id,
        campaign_name: v.campaigns?.name || "—",
        platform: v.platform,
        video_link: v.video_link,
        verified: v.verified,
        views: v.views || 0,
        submitted_at: v.submitted_at,
      }));

      setSubmissions(enrichedData);
      if (isRefresh) toast.success(t("common.data_updated") || "Dados atualizados!");
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error(t("submissions.error_loading"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerify = async (submissionId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .update({ verified })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success(verified ? t("submissions.video_validated") : t("submissions.video_rejected"));
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || t("submissions.error_processing"));
    }
  };

  const handleDelete = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;

      toast.success(t("submissions.video_deleted"));
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || t("submissions.error_deleting"));
    }
  };

  const handleApproveAll = async () => {
    try {
      const pendingIds = submissions.filter(s => !s.verified).map(s => s.id);
      
      if (pendingIds.length === 0) {
        toast.info(t("submissions.no_pending_videos") || "Não há vídeos pendentes");
        return;
      }

      const { error } = await supabase
        .from("campaign_videos")
        .update({ verified: true })
        .in("id", pendingIds);

      if (error) throw error;

      toast.success(t("submissions.all_videos_approved") || `${pendingIds.length} vídeos aprovados com sucesso!`);
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || t("submissions.error_processing"));
    }
  };

  const openConfirmDialog = (
    title: string, 
    description: string, 
    action: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({ open: true, title, description, action, variant });
  };

  const getStatusBadge = (verified: boolean) => {
    if (verified) {
      return (
        <Badge className="bg-success/15 text-success border-success/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("submissions.validated")}
        </Badge>
      );
    }
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30">
        <Clock className="h-3 w-3 mr-1" />
        {t("submissions.pending")}
      </Badge>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📸",
      tiktok: "🎵",
      youtube: "▶️",
    };
    return (
      <Badge variant="outline" className="text-xs">
        {icons[platform] || "📹"} {platform}
      </Badge>
    );
  };

  const exportFullReport = async () => {
    try {
      // Buscar todos os vídeos com métricas completas
      const { data: videosData, error: videosError } = await supabase
        .from("campaign_videos")
        .select("*, campaigns(name)")
        .order("submitted_at", { ascending: false });

      if (videosError) throw videosError;

      // Buscar todos os usuários
      const userIds = [...new Set((videosData || []).map((v) => v.submitted_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);

      // Calcular totais
      const totalViews = videosData?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;
      const totalLikes = videosData?.reduce((acc, v) => acc + (v.likes || 0), 0) || 0;
      const totalComments = videosData?.reduce((acc, v) => acc + (v.comments || 0), 0) || 0;
      const totalShares = videosData?.reduce((acc, v) => acc + (v.shares || 0), 0) || 0;

      // Headers do CSV
      const headers = [
        "ID",
        "Usuário",
        "Campanha",
        "Plataforma",
        "Link do Vídeo",
        "Status",
        "Views",
        "Likes",
        "Comentários",
        "Compartilhamentos",
        "Data de Envio"
      ];

      // Linhas de dados
      const rows = (videosData || []).map((v: any) => [
        v.id,
        `"${profileMap.get(v.submitted_by) || 'Desconhecido'}"`,
        `"${v.campaigns?.name || '—'}"`,
        v.platform,
        `"${v.video_link}"`,
        v.verified ? "Validado" : "Pendente",
        v.views || 0,
        v.likes || 0,
        v.comments || 0,
        v.shares || 0,
        format(new Date(v.submitted_at), "dd/MM/yyyy HH:mm")
      ]);

      // Adicionar resumo no topo
      let csvContent = "RELATÓRIO COMPLETO DE VÍDEOS - ADMIN\n\n";
      csvContent += "RESUMO GERAL\n";
      csvContent += `Total de Vídeos,${videosData?.length || 0}\n`;
      csvContent += `Total de Views,${totalViews.toLocaleString('pt-BR')}\n`;
      csvContent += `Total de Likes,${totalLikes.toLocaleString('pt-BR')}\n`;
      csvContent += `Total de Comentários,${totalComments.toLocaleString('pt-BR')}\n`;
      csvContent += `Total de Compartilhamentos,${totalShares.toLocaleString('pt-BR')}\n`;
      csvContent += `Data do Relatório,${format(new Date(), "dd/MM/yyyy HH:mm")}\n\n`;
      csvContent += "LISTA DE VÍDEOS\n";
      csvContent += headers.join(",") + "\n";
      csvContent += rows.map((row) => row.join(",")).join("\n");

      const blob = new Blob(['\ufeff' + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_videos_admin_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      
      toast.success("Relatório completo exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.video_link?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && !submission.verified) ||
      (filterStatus === "verified" && submission.verified);

    const matchesPlatform = filterPlatform === "all" || submission.platform === filterPlatform;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const pendingCount = submissions.filter((s) => !s.verified).length;
  const dateLocale = language === 'pt' ? ptBR : enUS;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15">
              <FileVideo className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("submissions.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount} {t("submissions.pending_verification")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 && (
              <Button 
                size="sm" 
                onClick={() => openConfirmDialog(
                  t("submissions.approve_all") || "Aprovar Todos",
                  t("submissions.approve_all_confirm") || `Tem certeza que deseja aprovar todos os ${pendingCount} vídeos pendentes?`,
                  handleApproveAll
                )}
                className="bg-success hover:bg-success/90"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {t("submissions.approve_all") || "Aprovar Todos"} ({pendingCount})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchSubmissions(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t("common.loading") || "Carregando..." : t("common.refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportFullReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("submissions.pending")}</p>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("submissions.validated")}</p>
              <p className="text-2xl font-bold text-success">
                {submissions.filter((s) => s.verified).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("common.total")}</p>
              <p className="text-2xl font-bold">{submissions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("submissions.search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="pending">{t("submissions.pending")}</SelectItem>
                  <SelectItem value="verified">{t("submissions.validated")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder={t("submissions.platform")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("submissions.user")}</TableHead>
                  <TableHead>{t("submissions.campaign")}</TableHead>
                  <TableHead>{t("submissions.platform")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead>{t("submissions.date")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FileVideo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">{t("submissions.no_submissions")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{submission.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {submission.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{submission.campaign_name}</span>
                      </TableCell>
                      <TableCell>{getPlatformBadge(submission.platform)}</TableCell>
                      <TableCell>{getStatusBadge(submission.verified)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {submission.views.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(submission.submitted_at), "MM/dd/yyyy", { locale: dateLocale })}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(submission.submitted_at), "HH:mm")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(submission.video_link, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {t("submissions.view_video")}
                            </DropdownMenuItem>
                            {!submission.verified && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      t("submissions.validate_video"),
                                      t("submissions.validate_confirm"),
                                      () => handleVerify(submission.id, true)
                                    )
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t("submissions.validate")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {submission.verified && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirmDialog(
                                    t("submissions.remove_validation"),
                                    t("submissions.remove_validation_confirm"),
                                    () => handleVerify(submission.id, false)
                                  )
                                }
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("submissions.unvalidate")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                openConfirmDialog(
                                  t("submissions.delete_video"),
                                  t("submissions.delete_confirm"),
                                  () => handleDelete(submission.id),
                                  "destructive"
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("submissions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className={confirmDialog.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

export default function AdminSubmissions() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminSubmissionsContent />
    </ProtectedRoute>
  );
}