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
import { Trophy, ArrowLeft, Calendar, Gift, FileText, Layers, DollarSign, Flame, Target } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MainLayout from "@/components/Layout/MainLayout";
import { CampaignType, getCampaignTypeLabel, getCampaignTypeColor } from "@/types/campaign";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    campaign_type: "pay_per_view" as CampaignType,
    payment_rate: 0,
    min_views: 0,
    max_paid_views: 0,
    prize_pool: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("campaigns").insert([
        {
          name: formData.name,
          description: formData.description,
          platforms: formData.platforms,
          platform: formData.platforms[0],
          start_date: formData.start_date,
          end_date: formData.end_date,
          prize_description: formData.prize_description,
          rules: formData.rules,
          image_url: formData.image_url || null,
          campaign_type: formData.campaign_type,
          payment_rate: formData.payment_rate,
          min_views: formData.min_views,
          max_paid_views: formData.max_paid_views,
          prize_pool: formData.prize_pool,
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

          {/* Campaign Type & Payment */}
          <GlowCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Tipo de Campanha e Pagamento
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Campanha *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'pay_per_view', label: 'Pagamento por View', icon: DollarSign, desc: 'Paga por cada 1.000 views' },
                    { id: 'fixed', label: 'Pagamento Fixo', icon: Target, desc: 'Valor fixo por participação' },
                    { id: 'competition_daily', label: 'Competição Diária', icon: Flame, desc: 'Ranking diário com premiação' },
                    { id: 'competition_monthly', label: 'Competição Mensal', icon: Trophy, desc: 'Ranking mensal com premiação' },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <label
                        key={type.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          formData.campaign_type === type.id
                            ? "bg-primary/10 border-primary/50"
                            : "bg-muted/20 border-border/30 hover:border-border/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="campaign_type"
                          value={type.id}
                          checked={formData.campaign_type === type.id}
                          onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as CampaignType })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{type.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formData.campaign_type === 'pay_per_view' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="space-y-2">
                    <Label htmlFor="payment_rate">Valor por 1K views (R$) *</Label>
                    <Input
                      id="payment_rate"
                      type="number"
                      step="0.01"
                      placeholder="3.20"
                      value={formData.payment_rate || ''}
                      onChange={(e) => setFormData({ ...formData, payment_rate: parseFloat(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_views">Views mínimas</Label>
                    <Input
                      id="min_views"
                      type="number"
                      placeholder="10000"
                      value={formData.min_views || ''}
                      onChange={(e) => setFormData({ ...formData, min_views: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_paid_views">Views máx. pagas</Label>
                    <Input
                      id="max_paid_views"
                      type="number"
                      placeholder="66000"
                      value={formData.max_paid_views || ''}
                      onChange={(e) => setFormData({ ...formData, max_paid_views: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              )}

              {(formData.campaign_type === 'competition_daily' || formData.campaign_type === 'competition_monthly') && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="space-y-2">
                    <Label htmlFor="prize_pool">Prêmio Total (R$)</Label>
                    <Input
                      id="prize_pool"
                      type="number"
                      step="0.01"
                      placeholder="1000.00"
                      value={formData.prize_pool || ''}
                      onChange={(e) => setFormData({ ...formData, prize_pool: parseFloat(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                </div>
              )}
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
                <Label htmlFor="prize_description">Descrição dos Prêmios</Label>
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