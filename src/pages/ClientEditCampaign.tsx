import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { GlowCard } from "@/components/ui/GlowCard";
import { PrizeConfigForm } from "@/components/Ranking/PrizeConfigForm";
import { useCompetitionPrizes, PrizeConfig } from "@/hooks/useCompetitionPrizes";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Trophy, ArrowLeft, Save, DollarSign, Flame, Target, Lock } from "lucide-react";
import { CampaignType } from "@/types/campaign";

function ClientEditCampaignContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  const { prizes, savePrizes } = useCompetitionPrizes(id || null);
  const [localPrizes, setLocalPrizes] = useState<PrizeConfig[]>([]);
  
  const [campaign, setCampaign] = useState({
    name: "",
    description: "",
    platforms: [] as string[],
    startDate: "",
    endDate: "",
    prizeDescription: "",
    rules: "",
    isActive: true,
    isPrivate: false,
    campaign_type: "pay_per_view" as CampaignType,
    payment_rate: 0,
    min_views: 0,
    max_paid_views: 0,
    prize_pool: 0,
  });

  const platformOptions = [
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" },
  ];

  useEffect(() => {
    if (user && id) {
      checkOwnership();
    }
  }, [user, id]);

  useEffect(() => {
    if (prizes.length > 0) {
      setLocalPrizes(prizes);
    }
  }, [prizes]);

  const checkOwnership = async () => {
    try {
      const { data: ownership, error: ownerError } = await supabase
        .from("campaign_owners")
        .select("id")
        .eq("campaign_id", id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (!ownership) {
        toast({
          title: t("common.error"),
          description: "You don't have permission to edit this campaign",
          variant: "destructive",
        });
        navigate("/client/campaigns");
        return;
      }

      setIsOwner(true);
      fetchCampaign();
    } catch (error) {
      console.error("Error checking ownership:", error);
      navigate("/client/campaigns");
    }
  };

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
        isPrivate: data.is_private || false,
        campaign_type: (data.campaign_type || 'pay_per_view') as CampaignType,
        payment_rate: Number(data.payment_rate || 0),
        min_views: Number(data.min_views || 0),
        max_paid_views: Number(data.max_paid_views || 0),
        prize_pool: Number(data.prize_pool || 0),
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast({
        title: t("msg.error_loading"),
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
          is_private: campaign.isPrivate,
          campaign_type: campaign.campaign_type,
          payment_rate: campaign.payment_rate,
          min_views: campaign.min_views,
          max_paid_views: campaign.max_paid_views,
          prize_pool: campaign.prize_pool,
        })
        .eq("id", id);

      if (error) throw error;

      // Save prizes for competition campaigns
      if (campaign.campaign_type === 'competition_daily' || campaign.campaign_type === 'competition_monthly') {
        await savePrizes(localPrizes);
      }

      toast({
        title: t("campaigns.campaign_updated"),
        description: t("campaigns.changes_saved"),
      });
    } catch (error: any) {
      toast({
        title: t("msg.error_saving"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  if (!isOwner) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-glow">{t("campaigns.edit_campaign")}</h1>
          </div>
        </div>

        {/* Form */}
        <Card className="glass-card p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <Label className="text-base font-semibold">{t("campaigns.campaign_status")}</Label>
              <p className="text-sm text-muted-foreground">
                {campaign.isActive ? t("campaigns.campaign_active") : t("campaigns.campaign_paused")}
              </p>
            </div>
            <Switch
              checked={campaign.isActive}
              onCheckedChange={(checked) =>
                setCampaign({ ...campaign, isActive: checked })
              }
            />
          </div>

          {/* Private Campaign */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base font-semibold">Campanha Privada</Label>
                <p className="text-sm text-muted-foreground">
                  {campaign.isPrivate 
                    ? "Visível apenas para participantes aprovados" 
                    : "Visível para todos os usuários"}
                </p>
              </div>
            </div>
            <Switch
              checked={campaign.isPrivate}
              onCheckedChange={(checked) =>
                setCampaign({ ...campaign, isPrivate: checked })
              }
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("campaigns.campaign_name")} *</Label>
            <Input
              id="name"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("common.description")}</Label>
            <Textarea
              id="description"
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Campaign Type & Payment Settings */}
          <GlowCard className="p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              {t("campaign_type.type_and_payment")}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'pay_per_view', label: t("campaign_type.pay_per_view"), icon: DollarSign },
                { id: 'fixed', label: t("campaign_type.fixed"), icon: Target },
                { id: 'competition_daily', label: t("campaign_type.competition_daily"), icon: Flame },
                { id: 'competition_monthly', label: t("campaign_type.competition_monthly"), icon: Trophy },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      campaign.campaign_type === type.id
                        ? "bg-primary/10 border-primary/50"
                        : "bg-muted/20 border-border/30 hover:border-border/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="campaign_type"
                      value={type.id}
                      checked={campaign.campaign_type === type.id}
                      onChange={(e) => setCampaign({ ...campaign, campaign_type: e.target.value as CampaignType })}
                    />
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm">{type.label}</span>
                  </label>
                );
              })}
            </div>

            {campaign.campaign_type === 'pay_per_view' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="space-y-2">
                  <Label>{t("campaign_type.rate_per_1k")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={campaign.payment_rate || ''}
                    onChange={(e) => setCampaign({ ...campaign, payment_rate: parseFloat(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("campaign_type.min_views")}</Label>
                  <Input
                    type="number"
                    value={campaign.min_views || ''}
                    onChange={(e) => setCampaign({ ...campaign, min_views: parseInt(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("campaign_type.max_paid_views")}</Label>
                  <Input
                    type="number"
                    value={campaign.max_paid_views || ''}
                    onChange={(e) => setCampaign({ ...campaign, max_paid_views: parseInt(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
              </div>
            )}

            {(campaign.campaign_type === 'competition_daily' || campaign.campaign_type === 'competition_monthly') && (
              <div className="space-y-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="space-y-2">
                  <Label>{t("campaign_type.total_prize")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={campaign.prize_pool || ''}
                    onChange={(e) => setCampaign({ ...campaign, prize_pool: parseFloat(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
                <PrizeConfigForm 
                  prizes={localPrizes}
                  onChange={setLocalPrizes}
                  totalPrizePool={campaign.prize_pool}
                />
              </div>
            )}

            {campaign.campaign_type === 'fixed' && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="space-y-2">
                  <Label>{t("campaign_type.fixed_value_per_video")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={campaign.payment_rate || ''}
                    onChange={(e) => setCampaign({ ...campaign, payment_rate: parseFloat(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
              </div>
            )}
          </GlowCard>

          {/* Platforms */}
          <div className="space-y-3">
            <Label>{t("campaigns.platforms_accepted")} *</Label>
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
              <Label htmlFor="startDate">{t("campaigns.start_date")} *</Label>
              <Input
                id="startDate"
                type="date"
                value={campaign.startDate}
                onChange={(e) => setCampaign({ ...campaign, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("campaigns.end_date")} *</Label>
              <Input
                id="endDate"
                type="date"
                value={campaign.endDate}
                onChange={(e) => setCampaign({ ...campaign, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Prize Description */}
          <div className="space-y-2">
            <Label htmlFor="prize">{t("campaigns.prize_description")}</Label>
            <Textarea
              id="prize"
              value={campaign.prizeDescription}
              onChange={(e) => setCampaign({ ...campaign, prizeDescription: e.target.value })}
              rows={3}
            />
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <Label htmlFor="rules">{t("campaigns.rules")}</Label>
            <Textarea
              id="rules"
              value={campaign.rules}
              onChange={(e) => setCampaign({ ...campaign, rules: e.target.value })}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="premium-gradient">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("campaigns.saving") : t("campaigns.save_changes")}
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function ClientEditCampaign() {
  return (
    <ProtectedRoute>
      <ClientEditCampaignContent />
    </ProtectedRoute>
  );
}
