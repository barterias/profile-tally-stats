import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Video, Instagram, Music, Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubmitVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Campaign {
  id: string;
  name: string;
  platforms: string[];
}

interface SocialAccount {
  username: string;
  profile_url: string;
}

export function SubmitVideoModal({ open, onOpenChange, onSuccess }: SubmitVideoModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [links, setLinks] = useState([""]);
  const [validatingLinks, setValidatingLinks] = useState<Record<number, boolean>>({});
  const [validatedLinks, setValidatedLinks] = useState<Record<number, { valid: boolean; username?: string; error?: string }>>({});
  const [userAccounts, setUserAccounts] = useState<{
    tiktok: SocialAccount[];
    instagram: SocialAccount[];
    youtube: SocialAccount[];
  }>({ tiktok: [], instagram: [], youtube: [] });

  useEffect(() => {
    if (open && user) {
      fetchApprovedCampaigns();
      fetchUserAccounts();
    }
  }, [open, user]);

  useEffect(() => {
    // Reset platform when campaign changes
    setSelectedPlatform("");
    setLinks([""]);
    setValidatedLinks({});
  }, [selectedCampaign]);

  const fetchApprovedCampaigns = async () => {
    const { data } = await supabase
      .from('campaign_participants')
      .select(`
        campaign_id,
        campaigns:campaign_id (id, name, platforms, is_active)
      `)
      .eq('user_id', user?.id)
      .eq('status', 'approved');

    const activeCampaigns = (data || [])
      .filter((p: any) => p.campaigns?.is_active)
      .map((p: any) => ({
        id: p.campaigns.id,
        name: p.campaigns.name,
        platforms: p.campaigns.platforms || [],
      }));

    setCampaigns(activeCampaigns);
  };

  const fetchUserAccounts = async () => {
    if (!user) return;

    const [tiktokRes, instagramRes, youtubeRes] = await Promise.all([
      supabase.from("tiktok_accounts").select("username, profile_url").eq("user_id", user.id).eq("is_active", true),
      supabase.from("instagram_accounts").select("username, profile_url").eq("user_id", user.id).eq("is_active", true),
      supabase.from("youtube_accounts").select("username, profile_url").eq("user_id", user.id).eq("is_active", true),
    ]);

    setUserAccounts({
      tiktok: tiktokRes.data || [],
      instagram: instagramRes.data || [],
      youtube: youtubeRes.data || [],
    });
  };

  const getAccountsForPlatform = (platformId: string): SocialAccount[] => {
    switch (platformId) {
      case 'tiktok': return userAccounts.tiktok;
      case 'instagram': return userAccounts.instagram;
      case 'youtube': return userAccounts.youtube;
      default: return [];
    }
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  const availablePlatforms = selectedCampaignData?.platforms || [];

  const platformIcons: Record<string, any> = {
    tiktok: Music,
    instagram: Instagram,
    youtube: Youtube,
  };

  const validateLink = (link: string): boolean => {
    const normalizedLink = link.toLowerCase().trim();
    if (selectedPlatform === 'tiktok') return normalizedLink.includes('tiktok.com');
    if (selectedPlatform === 'instagram') return normalizedLink.includes('instagram.com');
    if (selectedPlatform === 'youtube') return normalizedLink.includes('youtube.com') || normalizedLink.includes('youtu.be');
    return false;
  };

  const handleValidateLink = async (index: number) => {
    const link = links[index];
    if (!link.trim()) return;

    setValidatingLinks(prev => ({ ...prev, [index]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: { videoUrl: link },
      });

      if (error || !data?.success) {
        // API failed, allow with manual validation
        setValidatedLinks(prev => ({
          ...prev,
          [index]: { valid: true, error: "Será validado manualmente" },
        }));
      } else {
        const videoUsername = data.data?.author?.username?.toLowerCase()?.replace('@', '');
        const accounts = getAccountsForPlatform(selectedPlatform);
        const matchingAccount = accounts.find(a => a.username.toLowerCase().replace('@', '') === videoUsername);

        if (matchingAccount) {
          setValidatedLinks(prev => ({ ...prev, [index]: { valid: true, username: videoUsername } }));
        } else if (!videoUsername) {
          setValidatedLinks(prev => ({ ...prev, [index]: { valid: true, error: "Será validado manualmente" } }));
        } else {
          setValidatedLinks(prev => ({
            ...prev,
            [index]: { valid: false, error: `Vídeo pertence a @${videoUsername}` },
          }));
        }
      }
    } catch {
      setValidatedLinks(prev => ({ ...prev, [index]: { valid: true, error: "Será validado manualmente" } }));
    } finally {
      setValidatingLinks(prev => ({ ...prev, [index]: false }));
    }
  };

  const addLink = () => {
    setLinks([...links, ""]);
  };

  const removeLink = (index: number) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index));
      setValidatedLinks(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
    setValidatedLinks(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCampaign || !selectedPlatform) {
      toast.error("Selecione campanha e plataforma");
      return;
    }

    const validLinks = links.filter(l => l.trim() && validateLink(l));
    if (validLinks.length === 0) {
      toast.error("Adicione pelo menos um link válido");
      return;
    }

    // Check for invalid validated links
    const hasInvalid = validLinks.some((_, i) => validatedLinks[i]?.valid === false);
    if (hasInvalid) {
      toast.error("Corrija os links inválidos antes de enviar");
      return;
    }

    setLoading(true);
    try {
      const promises = validLinks.map(link =>
        supabase.from("campaign_videos").insert({
          campaign_id: selectedCampaign,
          video_link: link,
          platform: selectedPlatform,
          submitted_by: user?.id,
          verified: false,
        })
      );

      await Promise.all(promises);
      toast.success(`${validLinks.length} vídeo(s) enviado(s) com sucesso!`);
      onOpenChange(false);
      setLinks([""]);
      setSelectedCampaign("");
      setSelectedPlatform("");
      setValidatedLinks({});
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar vídeos");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlatformAccounts = getAccountsForPlatform(selectedPlatform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Enviar Vídeo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Selection */}
          <div className="space-y-2">
            <Label>Campanha</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhuma campanha aprovada</SelectItem>
                ) : (
                  campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Platform Selection */}
          {selectedCampaign && (
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <div className="grid grid-cols-3 gap-2">
                {availablePlatforms.map(platform => {
                  const Icon = platformIcons[platform] || Video;
                  const accounts = getAccountsForPlatform(platform);
                  const isDisabled = accounts.length === 0;
                  
                  return (
                    <Button
                      key={platform}
                      type="button"
                      variant={selectedPlatform === platform ? "default" : "outline"}
                      className={`flex flex-col items-center py-4 h-auto ${isDisabled ? 'opacity-50' : ''}`}
                      onClick={() => !isDisabled && setSelectedPlatform(platform)}
                      disabled={isDisabled}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs capitalize">{platform}</span>
                      {isDisabled && <span className="text-[10px] text-muted-foreground">Sem conta</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Info */}
          {selectedPlatform && selectedPlatformAccounts.length > 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                Contas cadastradas: {selectedPlatformAccounts.map(a => `@${a.username}`).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Video Links */}
          {selectedPlatform && (
            <div className="space-y-3">
              <Label>Links dos Vídeos</Label>
              {links.map((link, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`https://${selectedPlatform}.com/...`}
                      value={link}
                      onChange={(e) => updateLink(index, e.target.value)}
                      className={validatedLinks[index]?.valid === false ? 'border-destructive' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleValidateLink(index)}
                      disabled={!link.trim() || validatingLinks[index]}
                    >
                      {validatingLinks[index] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : validatedLinks[index]?.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : validatedLinks[index]?.valid === false ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                    {links.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLink(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {validatedLinks[index]?.error && (
                    <p className={`text-xs ${validatedLinks[index]?.valid ? 'text-yellow-500' : 'text-destructive'}`}>
                      {validatedLinks[index].error}
                    </p>
                  )}
                  {validatedLinks[index]?.valid && validatedLinks[index]?.username && (
                    <p className="text-xs text-green-500">
                      ✓ Validado: @{validatedLinks[index].username}
                    </p>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar outro link
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedCampaign || !selectedPlatform}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Vídeos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
