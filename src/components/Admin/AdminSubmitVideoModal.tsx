import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Video, Instagram, Youtube, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface UserProfile {
  id: string;
  username: string;
}

// TikTok SVG Icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export function AdminSubmitVideoModal({ open, onOpenChange, onSuccess, preselectedCampaignId }: AdminSubmitVideoModalProps) {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState(preselectedCampaignId || "");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [links, setLinks] = useState([""]);
  const [validatingLinks, setValidatingLinks] = useState<Record<number, boolean>>({});
  const [validatedLinks, setValidatedLinks] = useState<Record<number, { valid: boolean; error?: string }>>({});
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetchCampaigns();
      fetchUsers();
      if (preselectedCampaignId) {
        setSelectedCampaign(preselectedCampaignId);
      }
    }
  }, [open, preselectedCampaignId]);

  useEffect(() => {
    // Reset when campaign changes
    setSelectedPlatform("");
    setLinks([""]);
    setValidatedLinks({});
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, platforms, is_active')
      .eq('is_active', true)
      .order('name');

    setCampaigns((data || []).map(c => ({
      id: c.id,
      name: c.name,
      platforms: c.platforms || [],
    })));
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .order('username');

    setUsers(data || []);
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);
  const availablePlatforms = selectedCampaignData?.platforms || [];

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const platformIcons: Record<string, any> = {
    tiktok: TikTokIcon,
    instagram: Instagram,
    youtube: Youtube,
  };

  const platformColors: Record<string, string> = {
    tiktok: 'text-[#25F4EE]',
    instagram: 'text-[#E1306C]',
    youtube: 'text-[#FF0000]',
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

    if (!validateLink(link)) {
      setValidatedLinks(prev => ({
        ...prev,
        [index]: { valid: false, error: "Link não corresponde à plataforma" },
      }));
      return;
    }

    setValidatingLinks(prev => ({ ...prev, [index]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: { videoUrl: link },
      });

      if (error || !data?.success) {
        setValidatedLinks(prev => ({
          ...prev,
          [index]: { valid: true, error: "Métricas serão buscadas após envio" },
        }));
      } else {
        setValidatedLinks(prev => ({ ...prev, [index]: { valid: true } }));
      }
    } catch {
      setValidatedLinks(prev => ({ ...prev, [index]: { valid: true, error: "Será validado após envio" } }));
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

    setLoading(true);
    try {
      for (const link of validLinks) {
        const { data: insertedVideo, error: insertError } = await supabase
          .from("campaign_videos")
          .insert({
            campaign_id: selectedCampaign,
            video_link: link,
            platform: selectedPlatform,
            submitted_by: selectedUser || null,
            verified: true, // Admin submissions are auto-verified
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

        // Fetch metrics from API
        try {
          const { data: metricsData } = await supabase.functions.invoke('video-details', {
            body: { videoUrl: link },
          });

          if (metricsData?.success && metricsData?.data) {
            const metrics = {
              views: metricsData.data.viewsCount || 0,
              likes: metricsData.data.likesCount || 0,
              comments: metricsData.data.commentsCount || 0,
              shares: metricsData.data.sharesCount || 0,
            };

            await supabase
              .from("campaign_videos")
              .update(metrics)
              .eq("id", insertedVideo.id);
          }
        } catch (metricsError) {
          console.error("Error fetching metrics:", metricsError);
        }
      }

      toast.success(`${validLinks.length} vídeo(s) adicionado(s) com sucesso!`);
      onOpenChange(false);
      setLinks([""]);
      setSelectedCampaign(preselectedCampaignId || "");
      setSelectedPlatform("");
      setSelectedUser("");
      setValidatedLinks({});
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar vídeos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Adicionar Vídeo (Admin)
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
                  <SelectItem value="none" disabled>Nenhuma campanha ativa</SelectItem>
                ) : (
                  campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* User Selection (Optional) */}
          {selectedCampaign && (
            <div className="space-y-2">
              <Label>Atribuir a usuário (opcional)</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="">Nenhum (vídeo sem dono)</SelectItem>
                    {filteredUsers.slice(0, 50).map(u => (
                      <SelectItem key={u.id} value={u.id}>@{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Platform Selection */}
          {selectedCampaign && (
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <div className="grid grid-cols-3 gap-2">
                {availablePlatforms.map(platform => {
                  const Icon = platformIcons[platform] || Video;
                  const colorClass = platformColors[platform] || '';
                  
                  return (
                    <Button
                      key={platform}
                      type="button"
                      variant={selectedPlatform === platform ? "default" : "outline"}
                      className="flex flex-col items-center py-4 h-auto"
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      <Icon className={`h-6 w-6 mb-1 ${selectedPlatform !== platform ? colorClass : ''}`} />
                      <span className="text-xs capitalize">{platform}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video Links */}
          {selectedPlatform && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Links dos vídeos</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLink}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {links.map((link, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder={`Link do ${selectedPlatform}`}
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                        onBlur={() => link.trim() && handleValidateLink(index)}
                      />
                      {validatingLinks[index] && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                      )}
                      {validatedLinks[index]?.valid && !validatingLinks[index] && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                      {validatedLinks[index]?.valid === false && !validatingLinks[index] && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
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
                    <p className={`text-xs ${validatedLinks[index]?.valid ? 'text-yellow-500' : 'text-red-500'}`}>
                      {validatedLinks[index].error}
                    </p>
                  )}
                </div>
              ))}

              <Alert>
                <AlertDescription className="text-xs">
                  Como admin, os vídeos serão adicionados como verificados automaticamente.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedCampaign || !selectedPlatform || links.every(l => !l.trim())}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Vídeos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
