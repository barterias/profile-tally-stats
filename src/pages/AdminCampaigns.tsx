import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  Video,
  Play,
  Pause,
  RefreshCw,
  Download,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingClippersModal } from "@/components/Campaign/PendingClippersModal";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  created_at: string;
  participants?: number;
  videos?: number;
  totalViews?: number;
}

interface CampaignForm {
  name: string;
  description: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
}

const initialForm: CampaignForm = {
  name: "",
  description: "",
  platforms: [],
  start_date: "",
  end_date: "",
  prize_description: "",
  is_active: true,
};

function AdminCampaignsContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [selectedCampaignForPending, setSelectedCampaignForPending] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch stats for each campaign
      const campaignsWithStats = await Promise.all(
        (data || []).map(async (campaign) => {
          const { data: videos } = await supabase
            .from("campaign_videos")
            .select("*")
            .eq("campaign_id", campaign.id);

          const participants = new Set(videos?.map((v) => v.submitted_by)).size;
          const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;

          return {
            ...campaign,
            participants,
            videos: videos?.length || 0,
            totalViews,
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        name: form.name,
        description: form.description,
        platform: form.platforms[0] || "instagram",
        platforms: form.platforms,
        start_date: form.start_date,
        end_date: form.end_date,
        prize_description: form.prize_description,
        is_active: form.is_active,
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from("campaigns")
          .update(campaignData)
          .eq("id", editingCampaign.id);

        if (error) throw error;
        toast.success("Campanha atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("campaigns").insert(campaignData);

        if (error) throw error;
        toast.success("Campanha criada com sucesso!");
      }

      setDialogOpen(false);
      setEditingCampaign(null);
      setForm(initialForm);
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;

    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

      if (error) throw error;
      toast.success("Campanha excluída com sucesso!");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir campanha");
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success(campaign.is_active ? "Campanha pausada" : "Campanha ativada");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description || "",
      platforms: campaign.platforms || [campaign.platform],
      start_date: campaign.start_date.split("T")[0],
      end_date: campaign.end_date.split("T")[0],
      prize_description: campaign.prize_description || "",
      is_active: campaign.is_active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCampaign(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const exportCSV = () => {
    const headers = ["Nome", "Status", "Início", "Fim", "Participantes", "Vídeos", "Views"];
    const rows = filteredCampaigns.map((c) => [
      c.name,
      c.is_active ? "Ativa" : "Inativa",
      format(new Date(c.start_date), "dd/MM/yyyy"),
      format(new Date(c.end_date), "dd/MM/yyyy"),
      c.participants || 0,
      c.videos || 0,
      c.totalViews || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `campanhas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Campanhas exportadas com sucesso!");
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && campaign.is_active) ||
      (filterStatus === "inactive" && !campaign.is_active);

    return matchesSearch && matchesStatus;
  });

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
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Campanhas</h1>
              <p className="text-sm text-muted-foreground">
                {campaigns.length} campanhas • {campaigns.filter((c) => c.is_active).length} ativas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as any)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Participantes</TableHead>
                  <TableHead className="text-center">Vídeos</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {(campaign.platforms || [campaign.platform]).map((p) => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5">
                                  {p === "instagram" && "📸"}
                                  {p === "tiktok" && "🎵"}
                                  {p === "youtube" && "▶️"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            campaign.is_active
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {campaign.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(campaign.start_date), "dd/MM/yyyy")}</p>
                          <p className="text-muted-foreground text-xs">
                            até {format(new Date(campaign.end_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.participants || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.videos || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {(campaign.totalViews || 0).toLocaleString("pt-BR")}
                          </span>
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
                            <DropdownMenuItem onClick={() => navigate(`/campaign/${campaign.id}`, { state: { from: '/admin/campaigns' } })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCampaignForPending({ id: campaign.id, name: campaign.name });
                              setPendingModalOpen(true);
                            }}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Gerenciar Inscrições
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(campaign)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                              {campaign.is_active ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
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

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Editar Campanha" : "Nova Campanha"}
              </DialogTitle>
              <DialogDescription>
                {editingCampaign
                  ? "Atualize as informações da campanha"
                  : "Preencha os dados para criar uma nova campanha"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Campeonato de Cortes Março"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva a campanha..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Plataformas</Label>
                <div className="flex gap-2">
                  {["instagram", "tiktok", "youtube"].map((platform) => (
                    <Button
                      key={platform}
                      type="button"
                      variant={form.platforms.includes(platform) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newPlatforms = form.platforms.includes(platform)
                          ? form.platforms.filter((p) => p !== platform)
                          : [...form.platforms, platform];
                        setForm({ ...form, platforms: newPlatforms });
                      }}
                    >
                      {platform === "instagram" && "📸 Instagram"}
                      {platform === "tiktok" && "🎵 TikTok"}
                      {platform === "youtube" && "▶️ YouTube"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prize">Descrição do Prêmio</Label>
                <Input
                  id="prize"
                  value={form.prize_description}
                  onChange={(e) => setForm({ ...form, prize_description: e.target.value })}
                  placeholder="Ex: R$ 1.000 + Kit de Produtos"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Campanha Ativa</Label>
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrUpdate} disabled={saving}>
                {saving ? "Salvando..." : editingCampaign ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pending Clippers Modal */}
        <PendingClippersModal
          open={pendingModalOpen}
          onOpenChange={setPendingModalOpen}
          campaignId={selectedCampaignForPending?.id}
          campaignName={selectedCampaignForPending?.name}
        />
      </div>
    </MainLayout>
  );
}

export default function AdminCampaigns() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminCampaignsContent />
    </ProtectedRoute>
  );
}
