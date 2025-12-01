import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data: videosData, error } = await supabase
        .from("campaign_videos")
        .select("*, campaigns(name)")
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for usernames
      const userIds = [...new Set((videosData || []).map((v) => v.submitted_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.username]) || []);

      const enrichedData: VideoSubmission[] = (videosData || []).map((v: any) => ({
        id: v.id,
        user_id: v.submitted_by || "",
        username: profileMap.get(v.submitted_by) || "Usuário",
        campaign_id: v.campaign_id,
        campaign_name: v.campaigns?.name || "—",
        platform: v.platform,
        video_link: v.video_link,
        verified: v.verified,
        views: v.views || 0,
        submitted_at: v.submitted_at,
      }));

      setSubmissions(enrichedData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Erro ao carregar submissões");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (submissionId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .update({ verified })
        .eq("id", submissionId);

      if (error) throw error;

      toast.success(verified ? "Vídeo validado!" : "Vídeo rejeitado");
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar");
    }
  };

  const openConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const getStatusBadge = (verified: boolean) => {
    if (verified) {
      return (
        <Badge className="bg-success/15 text-success border-success/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validado
        </Badge>
      );
    }
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
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

  const exportCSV = () => {
    const headers = ["ID", "Usuário", "Campanha", "Plataforma", "Status", "Views", "Data"];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.username,
      s.campaign_name,
      s.platform,
      s.verified ? "Validado" : "Pendente",
      s.views,
      format(new Date(s.submitted_at), "dd/MM/yyyy HH:mm"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `submissions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Relatório exportado!");
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
              <h1 className="text-2xl font-bold">Submissões de Vídeo</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount} pendentes de verificação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchSubmissions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Validados</p>
              <p className="text-2xl font-bold text-success">
                {submissions.filter((s) => s.verified).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
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
                  placeholder="Buscar por usuário, campanha ou link..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="verified">Validados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FileVideo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhuma submissão encontrada</p>
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
                            {submission.views.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(submission.submitted_at), "dd/MM/yyyy")}</p>
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
                              Ver Vídeo
                            </DropdownMenuItem>
                            {!submission.verified && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    openConfirmDialog(
                                      "Validar Vídeo",
                                      "Marcar este vídeo como validado?",
                                      () => handleVerify(submission.id, true)
                                    )
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Validar
                                </DropdownMenuItem>
                              </>
                            )}
                            {submission.verified && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  openConfirmDialog(
                                    "Remover Validação",
                                    "Remover validação deste vídeo?",
                                    () => handleVerify(submission.id, false)
                                  )
                                }
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Remover Validação
                              </DropdownMenuItem>
                            )}
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

export default function AdminSubmissions() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminSubmissionsContent />
    </ProtectedRoute>
  );
}
