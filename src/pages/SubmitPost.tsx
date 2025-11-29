import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { n8nWebhook } from "@/lib/externalSupabase";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  ChevronRight,
  Instagram,
  Music,
  Youtube,
  Upload,
  Loader2,
} from "lucide-react";

const STEPS = ["Competição", "Plataforma", "Links"];

export default function SubmitPost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    campaignId: "",
    platform: "",
    links: [""],
  });

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  const fetchActiveCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const platforms = [
    { id: "tiktok", name: "TikTok", icon: Music, color: "text-pink-500" },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "text-purple-500" },
    { id: "youtube", name: "YouTube Shorts", icon: Youtube, color: "text-red-500" },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !formData.campaignId) {
      toast({
        title: "Selecione uma competição",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 1 && !formData.platform) {
      toast({
        title: "Selecione uma plataforma",
        variant: "destructive",
      });
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addLinkField = () => {
    setFormData({
      ...formData,
      links: [...formData.links, ""],
    });
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = value;
    setFormData({ ...formData, links: newLinks });
  };

  const removeLink = (index: number) => {
    if (formData.links.length > 1) {
      const newLinks = formData.links.filter((_, i) => i !== index);
      setFormData({ ...formData, links: newLinks });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validLinks = formData.links.filter((link) => link.trim() !== "");
      
      if (validLinks.length === 0) {
        throw new Error("Adicione pelo menos um link");
      }

      // Insert videos
      const promises = validLinks.map((link) =>
        supabase.from("campaign_videos").insert({
          campaign_id: formData.campaignId,
          video_link: link,
          platform: formData.platform,
          submitted_by: user?.id,
          verified: false,
        })
      );

      await Promise.all(promises);

      // Track videos via webhook
      await Promise.all(validLinks.map((link) => n8nWebhook.trackVideo(link)));

      toast({
        title: "Posts enviados com sucesso!",
        description: "Seus vídeos estão sendo rastreados. As métricas serão atualizadas em breve.",
      });

      navigate("/campaigns");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar posts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      index < currentStep
                        ? "bg-primary border-primary text-primary-foreground"
                        : index === currentStep
                        ? "border-primary text-primary neon-border"
                        : "border-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <p className={`text-sm mt-2 ${index === currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 mb-6 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="glass-card p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Escolha a Competição</h2>
                <p className="text-muted-foreground">
                  Selecione em qual competição você deseja participar
                </p>
              </div>
              
              <div className="grid gap-4">
                {campaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma competição ativa no momento
                  </p>
                ) : (
                  campaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className={`p-6 cursor-pointer transition-all ${
                        formData.campaignId === campaign.id
                          ? "neon-border bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, campaignId: campaign.id })
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">
                            {campaign.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {campaign.description}
                          </p>
                          {campaign.prize_description && (
                            <p className="text-sm text-primary">
                              Prêmio: {campaign.prize_description}
                            </p>
                          )}
                        </div>
                        {formData.campaignId === campaign.id && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Escolha a Plataforma</h2>
                <p className="text-muted-foreground">
                  De qual rede social é o seu vídeo?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <Card
                      key={platform.id}
                      className={`p-6 cursor-pointer transition-all ${
                        formData.platform === platform.id
                          ? "neon-border bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, platform: platform.id })
                      }
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <Icon className={`h-12 w-12 ${platform.color}`} />
                        <h3 className="font-semibold">{platform.name}</h3>
                        {formData.platform === platform.id && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Cole os Links</h2>
                <p className="text-muted-foreground">
                  Adicione os links dos seus vídeos (você pode adicionar múltiplos)
                </p>
              </div>

              <div className="space-y-4">
                {formData.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`link-${index}`}>
                        Link {index + 1}
                      </Label>
                      <Input
                        id={`link-${index}`}
                        placeholder={`Cole o link do ${
                          platforms.find((p) => p.id === formData.platform)?.name
                        }`}
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                      />
                    </div>
                    {formData.links.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLink(index)}
                        className="mt-6"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addLinkField}
                className="w-full"
              >
                + Adicionar outro link
              </Button>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={currentStep === 0 ? () => navigate(-1) : handleBack}
            >
              Voltar
            </Button>
            <Button
              onClick={handleNext}
              disabled={loading}
              className="premium-gradient"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Posts
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
