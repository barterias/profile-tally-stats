import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Video, CheckCircle2 } from "lucide-react";

interface AdminSubmitVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedCampaignId?: string;
}

interface Campaign {
  id: string;
  name: string;
  platforms: string[];
}

// Detecta plataforma automaticamente pelo link
function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  return null;
}

export function AdminSubmitVideoModal({ open, onOpenChange, onSuccess, preselectedCampaignId }: AdminSubmitVideoModalProps) {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState(preselectedCampaignId || "");
  const [links, setLinks] = useState([""]);

  useEffect(() => {
    if (open) {
      fetchCampaigns();
      if (preselectedCampaignId) {
        setSelectedCampaign(preselectedCampaignId);
      }
    }
  }, [open, preselectedCampaignId]);

  useEffect(() => {
    // Reset links when campaign changes
    setLinks([""]);
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, platforms, is_active")
      .eq("is_active", true)
      .order("name");

    setCampaigns(
      (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        platforms: c.platforms || [],
      }))
    );
  };

  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign);

  const addLink = () => setLinks([...links, ""]);

  const removeLink = (index: number) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index));
    }
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSubmit = async () => {
    if (!selectedCampaign) {
      toast.error("Selecione uma campanha");
      return;
    }

    const validLinks = links
      .map((l) => l.trim())
      .filter((l) => l && detectPlatform(l));

    if (validLinks.length === 0) {
      toast.error("Adicione pelo menos um link válido (TikTok, Instagram ou YouTube)");
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const link of validLinks) {
        const platform = detectPlatform(link);
        if (!platform) continue;

        // Verificar se a plataforma é suportada pela campanha
        if (selectedCampaignData?.platforms?.length && !selectedCampaignData.platforms.includes(platform)) {
          toast.warning(`${platform} não é suportado por esta campanha`);
          continue;
        }

        const { data: insertedVideo, error: insertError } = await supabase
          .from("campaign_videos")
          .insert({
            campaign_id: selectedCampaign,
            video_link: link,
            platform,
            submitted_by: null,
            verified: true,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting video:", insertError);
          continue;
        }

        successCount++;

        // Buscar métricas em background
        supabase.functions
          .invoke("video-details", { body: { videoUrl: link } })
          .then(({ data: metricsData }) => {
            if (metricsData?.success && metricsData?.data) {
              supabase
                .from("campaign_videos")
                .update({
                  views: metricsData.data.viewsCount || 0,
                  likes: metricsData.data.likesCount || 0,
                  comments: metricsData.data.commentsCount || 0,
                  shares: metricsData.data.sharesCount || 0,
                })
                .eq("id", insertedVideo.id);
            }
          })
          .catch(() => {});
      }

      if (successCount > 0) {
        toast.success(`${successCount} vídeo(s) adicionado(s)!`);
        onOpenChange(false);
        setLinks([""]);
        setSelectedCampaign(preselectedCampaignId || "");
        onSuccess?.();
      } else {
        toast.error("Nenhum vídeo foi adicionado");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar vídeos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Adicionar Vídeo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Campaign Selection */}
          <div className="space-y-2">
            <Label>Campanha</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma campanha ativa
                  </SelectItem>
                ) : (
                  campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedCampaignData && (
              <p className="text-xs text-muted-foreground">
                Plataformas: {selectedCampaignData.platforms.join(", ") || "todas"}
              </p>
            )}
          </div>

          {/* Video Links */}
          {selectedCampaign && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Link do vídeo</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLink}>
                  <Plus className="h-4 w-4 mr-1" />
                  Mais
                </Button>
              </div>

              {links.map((link, index) => {
                const detected = detectPlatform(link);
                return (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Cole o link do TikTok, Instagram ou YouTube"
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                      />
                      {detected && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-muted-foreground capitalize">{detected}</span>
                        </div>
                      )}
                    </div>
                    {links.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedCampaign || links.every((l) => !l.trim())}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
