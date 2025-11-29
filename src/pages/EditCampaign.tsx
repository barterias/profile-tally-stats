import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Trophy, ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function EditCampaignContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [campaign, setCampaign] = useState({
    name: "",
    description: "",
    platforms: [] as string[],
    startDate: "",
    endDate: "",
    prizeDescription: "",
    rules: "",
    isActive: true,
  });

  const platformOptions = [
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" },
  ];

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setCampaign({
        name: data.name || "",
        description: data.description || "",
        platforms: data.platforms || [data.platform],
        startDate: data.start_date?.split("T")[0] || "",
        endDate: data.end_date?.split("T")[0] || "",
        prizeDescription: data.prize_description || "",
        rules: data.rules || "",
        isActive: data.is_active,
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast({
        title: "Erro ao carregar campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: campaign.name,
          description: campaign.description,
          platforms: campaign.platforms,
          platform: campaign.platforms[0] || "instagram",
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          prize_description: campaign.prizeDescription,
          rules: campaign.rules,
          is_active: campaign.isActive,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Campanha atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // First delete related videos
      await supabase
        .from("campaign_videos")
        .delete()
        .eq("campaign_id", id);

      // Then delete the campaign
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Campanha excluída!",
      });
      navigate("/campaigns");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePlatform = (platform: string) => {
    setCampaign((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-glow">Editar Campanha</h1>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os vídeos associados também serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Form */}
        <Card className="glass-card p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <Label className="text-base font-semibold">Status da Campanha</Label>
              <p className="text-sm text-muted-foreground">
                {campaign.isActive ? "Campanha ativa e recebendo vídeos" : "Campanha pausada"}
              </p>
            </div>
            <Switch
              checked={campaign.isActive}
              onCheckedChange={(checked) =>
                setCampaign({ ...campaign, isActive: checked })
              }
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              placeholder="Ex: Campeonato de Cortes Março 2024"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
              placeholder="Descreva a campanha..."
              rows={3}
            />
          </div>

          {/* Platforms */}
          <div className="space-y-3">
            <Label>Plataformas Aceitas *</Label>
            <div className="flex flex-wrap gap-4">
              {platformOptions.map((platform) => (
                <div key={platform.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.id}
                    checked={campaign.platforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <Label htmlFor={platform.id} className="cursor-pointer">
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={campaign.startDate}
                onChange={(e) => setCampaign({ ...campaign, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término *</Label>
              <Input
                id="endDate"
                type="date"
                value={campaign.endDate}
                onChange={(e) => setCampaign({ ...campaign, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Prize */}
          <div className="space-y-2">
            <Label htmlFor="prize">Descrição dos Prêmios</Label>
            <Textarea
              id="prize"
              value={campaign.prizeDescription}
              onChange={(e) => setCampaign({ ...campaign, prizeDescription: e.target.value })}
              placeholder="Ex: 1º lugar: R$ 500, 2º lugar: R$ 300..."
              rows={3}
            />
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <Label htmlFor="rules">Regras</Label>
            <Textarea
              id="rules"
              value={campaign.rules}
              onChange={(e) => setCampaign({ ...campaign, rules: e.target.value })}
              placeholder="Defina as regras da competição..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="premium-gradient">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function EditCampaign() {
  return (
    <ProtectedRoute requireAdmin>
      <EditCampaignContent />
    </ProtectedRoute>
  );
}
