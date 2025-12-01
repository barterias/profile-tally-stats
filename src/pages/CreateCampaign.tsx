import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlowCard } from "@/components/ui/GlowCard";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Trophy, ArrowLeft, Calendar, Gift, FileText, Layers } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MainLayout from "@/components/Layout/MainLayout";

function CreateCampaignPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    platforms: ["instagram"] as string[],
    start_date: "",
    end_date: "",
    prize_description: "",
    rules: "",
    image_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("campaigns").insert([
        {
          ...formData,
          platform: formData.platforms[0],
          is_active: true,
        },
      ]);

      if (error) throw error;

      toast.success("Campanha criada com sucesso!");
      navigate("/admin/campaigns");
    } catch (error: any) {
      toast.error("Erro ao criar campanha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Criar Campanha
            </h1>
            <p className="text-muted-foreground mt-1">Configure uma nova campanha de clipes</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/campaigns")} className="border-border/50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Image */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Imagem da Campanha
            </h3>
            <ImageUpload
              bucket="campaign-images"
              folder="campaigns"
              currentImageUrl={formData.image_url}
              onUpload={(url) => setFormData({ ...formData, image_url: url })}
              type="cover"
              className="max-w-xl"
            />
          </GlowCard>

          {/* Basic Info */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Informações Básicas
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Spartans, Café com Ferri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva a campanha..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="bg-background/50 border-border/50"
                />
              </div>
            </div>
          </GlowCard>

          {/* Platforms */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Plataformas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "instagram", label: "Instagram", emoji: "📸" },
                { id: "tiktok", label: "TikTok", emoji: "🎵" },
                { id: "youtube", label: "YouTube", emoji: "▶️" },
              ].map((platform) => (
                <label
                  key={platform.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.platforms.includes(platform.id)
                      ? "bg-primary/10 border-primary/50"
                      : "bg-muted/20 border-border/30 hover:border-border/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, platforms: [...formData.platforms, platform.id] });
                      } else {
                        setFormData({
                          ...formData,
                          platforms: formData.platforms.filter((p) => p !== platform.id),
                        });
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-xl">{platform.emoji}</span>
                  <span className="font-medium">{platform.label}</span>
                </label>
              ))}
            </div>
            {formData.platforms.length === 0 && (
              <p className="text-sm text-destructive mt-2">Selecione pelo menos uma plataforma</p>
            )}
          </GlowCard>

          {/* Dates */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Período
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Término *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="bg-background/50 border-border/50"
                />
              </div>
            </div>
          </GlowCard>

          {/* Prizes & Rules */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Prêmios e Regras
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prize_description">Prêmios</Label>
                <Input
                  id="prize_description"
                  placeholder="Ex: R$ 1.000 para o 1º lugar"
                  value={formData.prize_description}
                  onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rules">Regras</Label>
                <Textarea
                  id="rules"
                  placeholder="Descreva as regras da campanha..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={6}
                  className="bg-background/50 border-border/50"
                />
              </div>
            </div>
          </GlowCard>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              disabled={loading || formData.platforms.length === 0}
            >
              {loading ? "Criando..." : "Criar Campanha"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border/50"
              onClick={() => navigate("/admin/campaigns")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

export default function CreateCampaign() {
  return (
    <ProtectedRoute requireAdmin>
      <CreateCampaignPage />
    </ProtectedRoute>
  );
}