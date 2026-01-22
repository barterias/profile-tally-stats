import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
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
  AlertCircle,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STEPS = ["Competição", "Plataforma", "Links"];

interface SocialAccount {
  id: string;
  username: string;
  profile_url: string;
}

export default function SubmitPost() {
  const { user } = useAuth();
  const { role, ownedCampaigns } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [userAccounts, setUserAccounts] = useState<{
    tiktok: SocialAccount[];
    instagram: SocialAccount[];
    youtube: SocialAccount[];
  }>({
    tiktok: [],
    instagram: [],
    youtube: [],
  });
  const [linkErrors, setLinkErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<"links" | "account">("links");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loadingAccountVideos, setLoadingAccountVideos] = useState(false);
  const [importedVideosMetrics, setImportedVideosMetrics] = useState<Record<string, { views: number; likes: number; comments: number; shares: number }>>({}); 
  
  const [formData, setFormData] = useState({
    campaignId: "",
    platform: "",
    links: [""],
  });

  useEffect(() => {
    fetchActiveCampaigns();
    fetchUserAccounts();
  }, [user, role, ownedCampaigns]);

  const fetchActiveCampaigns = async () => {
    if (!user) return;

    // If user is a client, only show campaigns they own
    if (role === 'client' && ownedCampaigns.length > 0) {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .in("id", ownedCampaigns)
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
    } else if (role === 'admin') {
      // Admins can see all active campaigns
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
    } else {
      // Clippers can only submit to campaigns where they are approved participants
      const { data: approvedParticipations } = await supabase
        .from("campaign_participants")
        .select("campaign_id")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (!approvedParticipations || approvedParticipations.length === 0) {
        setCampaigns([]);
        return;
      }

      const approvedCampaignIds = approvedParticipations.map(p => p.campaign_id);
      
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .in("id", approvedCampaignIds)
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
    }
  };

  const fetchUserAccounts = async () => {
    if (!user) return;

    // Admins see ALL accounts, others see only their own
    const isAdminOrClient = role === 'admin' || role === 'client';

    const [tiktokRes, instagramRes, youtubeRes] = await Promise.all([
      isAdminOrClient
        ? supabase
            .from("tiktok_accounts")
            .select("id, username, profile_url")
            .or('is_active.is.null,is_active.eq.true')
        : supabase
            .from("tiktok_accounts")
            .select("id, username, profile_url")
            .eq("user_id", user.id)
            .eq("is_active", true),
      isAdminOrClient
        ? supabase
            .from("instagram_accounts")
            .select("id, username, profile_url")
            .or('is_active.is.null,is_active.eq.true')
        : supabase
            .from("instagram_accounts")
            .select("id, username, profile_url")
            .eq("user_id", user.id)
            .eq("is_active", true),
      isAdminOrClient
        ? supabase
            .from("youtube_accounts")
            .select("id, username, profile_url")
            .or('is_active.is.null,is_active.eq.true')
        : supabase
            .from("youtube_accounts")
            .select("id, username, profile_url")
            .eq("user_id", user.id)
            .eq("is_active", true),
    ]);

    // Deduplicate by username for admins/clients
    const dedupeByUsername = (accounts: SocialAccount[]) => {
      const seen = new Set<string>();
      return accounts.filter(acc => {
        if (seen.has(acc.username.toLowerCase())) return false;
        seen.add(acc.username.toLowerCase());
        return true;
      });
    };

    setUserAccounts({
      tiktok: isAdminOrClient ? dedupeByUsername(tiktokRes.data || []) : (tiktokRes.data || []),
      instagram: isAdminOrClient ? dedupeByUsername(instagramRes.data || []) : (instagramRes.data || []),
      youtube: isAdminOrClient ? dedupeByUsername(youtubeRes.data || []) : (youtubeRes.data || []),
    });
  };

  const platforms = [
    { id: "tiktok", name: "TikTok", icon: Music, color: "text-pink-500" },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "text-purple-500" },
    { id: "youtube", name: "YouTube Shorts", icon: Youtube, color: "text-red-500" },
  ];

  const getAccountsForPlatform = (platformId: string): SocialAccount[] => {
    switch (platformId) {
      case 'tiktok':
        return userAccounts.tiktok;
      case 'instagram':
        return userAccounts.instagram;
      case 'youtube':
        return userAccounts.youtube;
      default:
        return [];
    }
  };

  const [validatingLinks, setValidatingLinks] = useState<Record<number, boolean>>({});
  const [validatedLinks, setValidatedLinks] = useState<Record<number, { valid: boolean; username?: string; apiError?: boolean }>>({});

  const validateLinkViaAPI = async (link: string, platformId: string, index: number): Promise<{ valid: boolean; username?: string; error?: string; apiError?: boolean }> => {
    const accounts = getAccountsForPlatform(platformId);

    // Admin/cliente podem enviar links mesmo sem ter a conta cadastrada no próprio perfil.
    // Nesse caso, segue para validação manual (não bloqueia o fluxo).
    if (accounts.length === 0) {
      if (role === "admin" || role === "client") {
        return {
          valid: true,
          apiError: true,
          error: "Sem conta vinculada no seu perfil. O vídeo será validado manualmente.",
        };
      }

      return { valid: false, error: "Nenhuma conta cadastrada para esta plataforma" };
    }

    try {
      // Call the video-details edge function to get the video author
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: { videoUrl: link },
      });

      if (error || !data?.success) {
        console.error('API validation error:', error || data?.error);
        // If API fails, we'll do a basic URL pattern check instead
        const normalizedLink = link.toLowerCase();
        const accountUsernames = accounts.map(a => a.username.toLowerCase());
        
        // Try to extract username from URL for basic validation
        let urlUsername = '';
        if (platformId === 'tiktok') {
          const match = normalizedLink.match(/@([^\/\?]+)/);
          urlUsername = match ? match[1] : '';
        } else if (platformId === 'youtube') {
          // For YouTube shorts, we can't easily extract username from URL
          // So we'll mark as API error but allow submission
          return { 
            valid: true, 
            apiError: true,
            error: "Não foi possível verificar automaticamente. O vídeo será validado manualmente." 
          };
        } else if (platformId === 'instagram') {
          // Instagram URLs don't contain username, mark for manual validation
          return { 
            valid: true, 
            apiError: true,
            error: "Não foi possível verificar automaticamente. O vídeo será validado manualmente." 
          };
        }

        if (urlUsername && accountUsernames.includes(urlUsername)) {
          return { valid: true, username: urlUsername };
        }
        
        return { 
          valid: true, 
          apiError: true,
          error: "Não foi possível verificar automaticamente. O vídeo será validado manualmente." 
        };
      }

      const videoDetails = data.data;
      const videoUsername = videoDetails.author?.username?.toLowerCase()?.replace('@', '');

      if (!videoUsername) {
        // If no username in response, allow with warning
        return { 
          valid: true, 
          apiError: true,
          error: "Não foi possível identificar o autor. O vídeo será validado manualmente." 
        };
      }

      // Check if the video author matches any registered account
      const matchingAccount = accounts.find(
        account => account.username.toLowerCase().replace('@', '') === videoUsername
      );

      if (matchingAccount) {
        return { valid: true, username: videoUsername };
      } else {
        const registeredUsernames = accounts.map(a => `@${a.username}`).join(', ');
        return { 
          valid: false, 
          error: `O vídeo pertence a @${videoUsername}, mas suas contas cadastradas são: ${registeredUsernames}` 
        };
      }
    } catch (error: any) {
      console.error('Validation exception:', error);
      // On exception, allow with warning
      return { 
        valid: true, 
        apiError: true,
        error: "Erro de conexão. O vídeo será validado manualmente." 
      };
    }
  };

  const validateLinkAgainstAccounts = (link: string, platformId: string): boolean => {
    // This is now just a simple URL format check
    const normalizedLink = link.toLowerCase().trim();
    
    if (platformId === 'tiktok') {
      return normalizedLink.includes('tiktok.com');
    } else if (platformId === 'instagram') {
      return normalizedLink.includes('instagram.com');
    } else if (platformId === 'youtube') {
      return normalizedLink.includes('youtube.com') || normalizedLink.includes('youtu.be');
    }
    
    return false;
  };

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

    // Check if user has accounts for the selected platform
    if (currentStep === 1) {
      const accounts = getAccountsForPlatform(formData.platform);

      // Admin/cliente podem prosseguir mesmo sem conta vinculada no próprio perfil
      // (ex: cadastrando vídeo para contas de outros usuários). Clippers continuam bloqueados.
      if (accounts.length === 0 && role !== "admin" && role !== "client") {
        toast({
          title: "Conta não cadastrada",
          description: `Você precisa cadastrar uma conta de ${platforms.find(p => p.id === formData.platform)?.name} em Account Analytics antes de enviar vídeos.`,
          variant: "destructive",
        });
        return;
      }
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

  const importVideosFromAccount = async () => {
    if (!selectedAccount || !formData.platform) return;
    
    setLoadingAccountVideos(true);
    try {
      let videos: { video_url: string; views?: number; likes?: number; comments?: number; shares?: number }[] = [];
      
      if (formData.platform === 'tiktok') {
        const { data } = await supabase
          .from('tiktok_videos')
          .select('video_url, views_count, likes_count, comments_count, shares_count')
          .eq('account_id', selectedAccount);
        videos = (data || []).map(v => ({
          video_url: v.video_url,
          views: v.views_count || 0,
          likes: v.likes_count || 0,
          comments: v.comments_count || 0,
          shares: v.shares_count || 0,
        }));
      } else if (formData.platform === 'instagram') {
        const { data } = await supabase
          .from('instagram_posts')
          .select('post_url, views_count, likes_count, comments_count, shares_count')
          .eq('account_id', selectedAccount);
        videos = (data || []).map(p => ({
          video_url: p.post_url,
          views: p.views_count || 0,
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          shares: p.shares_count || 0,
        }));
      } else if (formData.platform === 'youtube') {
        const { data } = await supabase
          .from('youtube_videos')
          .select('video_url, views_count, likes_count, comments_count')
          .eq('account_id', selectedAccount);
        videos = (data || []).map(v => ({
          video_url: v.video_url,
          views: v.views_count || 0,
          likes: v.likes_count || 0,
          comments: v.comments_count || 0,
          shares: 0,
        }));
      }
      
      if (videos.length === 0) {
        toast({
          title: "Nenhum vídeo encontrado",
          description: "Esta conta não possui vídeos sincronizados. Sincronize a conta primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      // Check which videos are already submitted for this campaign
      const videoUrls = videos.map(v => v.video_url);
      const { data: existingVideos } = await supabase
        .from('campaign_videos')
        .select('video_link')
        .eq('campaign_id', formData.campaignId)
        .in('video_link', videoUrls);
      
      const existingUrls = new Set((existingVideos || []).map(v => v.video_link));
      const newVideos = videos.filter(v => !existingUrls.has(v.video_url));
      
      if (newVideos.length === 0) {
        toast({
          title: "Todos os vídeos já foram enviados",
          description: "Todos os vídeos desta conta já estão cadastrados nesta campanha.",
        });
        return;
      }
      
      const newLinks = newVideos.map(v => v.video_url);
      setFormData(prev => ({ ...prev, links: newLinks }));
      
      // Store metrics for each imported video
      const metricsMap: Record<string, { views: number; likes: number; comments: number; shares: number }> = {};
      newVideos.forEach(v => {
        metricsMap[v.video_url] = {
          views: v.views || 0,
          likes: v.likes || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
        };
      });
      setImportedVideosMetrics(metricsMap);
      
      // Pre-validate all imported links
      const newValidatedLinks: Record<number, { valid: boolean; username?: string; apiError?: boolean }> = {};
      newLinks.forEach((_, index) => {
        newValidatedLinks[index] = { valid: true, username: selectedAccount };
      });
      setValidatedLinks(newValidatedLinks);
      setLinkErrors(new Array(newLinks.length).fill(""));
      
      toast({
        title: `${newLinks.length} vídeo(s) importado(s)`,
        description: `${existingUrls.size > 0 ? `${existingUrls.size} já estavam cadastrados.` : ''}`,
      });
    } catch (error) {
      console.error('Error importing videos:', error);
      toast({
        title: "Erro ao importar vídeos",
        variant: "destructive",
      });
    } finally {
      setLoadingAccountVideos(false);
    }
  };

  const getAccountsWithIds = () => {
    if (!formData.platform || !user) return [];
    
    // We need to fetch accounts with IDs
    return [];
  };

  const addLinkField = () => {
    setFormData({
      ...formData,
      links: [...formData.links, ""],
    });
    setLinkErrors([...linkErrors, ""]);
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = value;
    setFormData({ ...formData, links: newLinks });

    // Clear previous validation state
    setValidatedLinks(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    // Basic URL format validation
    const newErrors = [...linkErrors];
    if (value.trim() && !validateLinkAgainstAccounts(value, formData.platform)) {
      newErrors[index] = "URL inválida para esta plataforma";
    } else {
      newErrors[index] = "";
    }
    setLinkErrors(newErrors);
  };

  const handleValidateLink = async (index: number) => {
    const link = formData.links[index];
    if (!link.trim()) return;

    setValidatingLinks(prev => ({ ...prev, [index]: true }));
    setLinkErrors(prev => {
      const newErrors = [...prev];
      newErrors[index] = "";
      return newErrors;
    });

    const result = await validateLinkViaAPI(link, formData.platform, index);
    
    setValidatedLinks(prev => ({ 
      ...prev, 
      [index]: { 
        valid: result.valid, 
        username: result.username,
        apiError: result.apiError 
      } 
    }));
    
    if (!result.valid) {
      setLinkErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = result.error || "Vídeo não pertence a uma conta cadastrada";
        return newErrors;
      });
    } else if (result.apiError && result.error) {
      // Show warning but don't block
      setLinkErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = result.error;
        return newErrors;
      });
    }
    
    setValidatingLinks(prev => ({ ...prev, [index]: false }));
  };

  const removeLink = (index: number) => {
    if (formData.links.length > 1) {
      const newLinks = formData.links.filter((_, i) => i !== index);
      const newErrors = linkErrors.filter((_, i) => i !== index);
      setFormData({ ...formData, links: newLinks });
      setLinkErrors(newErrors);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validLinks = formData.links.filter((link) => link.trim() !== "");
      
      if (validLinks.length === 0) {
        throw new Error("Adicione pelo menos um link");
      }

      // Check for duplicate links in the current campaign
      const { data: existingVideos, error: checkError } = await supabase
        .from("campaign_videos")
        .select("video_link")
        .eq("campaign_id", formData.campaignId)
        .in("video_link", validLinks);

      if (checkError) {
        console.error("Error checking duplicates:", checkError);
        throw new Error("Erro ao verificar vídeos existentes");
      }

      const existingLinks = new Set((existingVideos || []).map(v => v.video_link));
      const duplicateLinks = validLinks.filter(link => existingLinks.has(link));

      if (duplicateLinks.length > 0) {
        const duplicateCount = duplicateLinks.length;
        throw new Error(`${duplicateCount} link(s) já cadastrado(s) nesta campanha. Remova os duplicados antes de enviar.`);
      }

      // Check if all links have been validated
      const allLinksValidated = validLinks.every((_, index) => validatedLinks[index]?.valid === true);
      
      if (!allLinksValidated) {
        // Validate all non-validated links
        const validationPromises = validLinks.map(async (link, index) => {
          if (!validatedLinks[index]) {
            setValidatingLinks(prev => ({ ...prev, [index]: true }));
            const result = await validateLinkViaAPI(link, formData.platform, index);
            setValidatedLinks(prev => ({ ...prev, [index]: { valid: result.valid, username: result.username } }));
            setValidatingLinks(prev => ({ ...prev, [index]: false }));
            
            if (!result.valid) {
              setLinkErrors(prev => {
                const newErrors = [...prev];
                newErrors[index] = result.error || "Vídeo não pertence a uma conta cadastrada";
                return newErrors;
              });
            }
            
            return result;
          }
          return validatedLinks[index];
        });

        const results = await Promise.all(validationPromises);
        const hasInvalidLinks = results.some(r => !r?.valid);
        
        if (hasInvalidLinks) {
          throw new Error("Alguns links não foram validados. Verifique se os vídeos pertencem às suas contas cadastradas.");
        }
      }

      // Insert videos with metrics
      for (const link of validLinks) {
        // Check if we have stored metrics for this link (from account import)
        const storedMetrics = importedVideosMetrics[link];
        
        // Insert the video with metrics if available
        const { data: insertedVideo, error: insertError } = await supabase
          .from("campaign_videos")
          .insert({
            campaign_id: formData.campaignId,
            video_link: link,
            platform: formData.platform,
            submitted_by: user?.id,
            verified: false,
            views: storedMetrics?.views || 0,
            likes: storedMetrics?.likes || 0,
            comments: storedMetrics?.comments || 0,
            shares: storedMetrics?.shares || 0,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting video:", insertError);
          continue;
        }

        // Only fetch from API if we don't have stored metrics (manual link entry)
        if (!storedMetrics) {
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
            console.error("Error fetching metrics for video:", metricsError);
          }
        }
      }

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

  const selectedPlatformAccounts = getAccountsForPlatform(formData.platform);

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
                    {role === 'client' 
                      ? "Você não possui campanhas ativas no momento" 
                      : "Nenhuma competição ativa no momento"}
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
                  const accountCount = getAccountsForPlatform(platform.id).length;
                  const canProceedWithoutAccount = role === "admin" || role === "client";

                  return (
                    <Card
                      key={platform.id}
                      className={`p-6 cursor-pointer transition-all ${
                        formData.platform === platform.id
                          ? "neon-border bg-primary/5"
                          : "hover:border-primary/50"
                      } ${accountCount === 0 && !canProceedWithoutAccount ? "opacity-50" : ""}`}
                      onClick={() => setFormData({ ...formData, platform: platform.id })}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <Icon className={`h-12 w-12 ${platform.color}`} />
                        <h3 className="font-semibold">{platform.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {accountCount === 0
                            ? canProceedWithoutAccount
                              ? "Sem conta no seu perfil (ok)"
                              : "Nenhuma conta cadastrada"
                            : `${accountCount} conta${accountCount > 1 ? "s" : ""} cadastrada${accountCount > 1 ? "s" : ""}`}
                        </p>
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

              {formData.platform && getAccountsForPlatform(formData.platform).length === 0 && (
                (role === "admin" || role === "client") ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você não tem uma conta de {platforms.find(p => p.id === formData.platform)?.name} vinculada no seu perfil, mas pode continuar e o vídeo ficará para validação manual.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você precisa cadastrar uma conta de {platforms.find(p => p.id === formData.platform)?.name} em{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-destructive underline"
                        onClick={() => navigate("/account-analytics")}
                      >
                        Account Analytics
                      </Button>{" "}
                      antes de enviar vídeos.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Adicionar Vídeos</h2>
                <p className="text-muted-foreground">
                  Adicione links individualmente ou importe todos os vídeos de uma conta
                </p>
              </div>

              <Tabs value={importMode} onValueChange={(v) => setImportMode(v as "links" | "account")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="links">Links Individuais</TabsTrigger>
                  <TabsTrigger value="account">
                    <Users className="h-4 w-4 mr-2" />
                    Importar da Conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Selecione a conta para importar todos os vídeos</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha uma conta cadastrada" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPlatformAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            @{account.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={importVideosFromAccount}
                    disabled={!selectedAccount || loadingAccountVideos}
                    className="w-full"
                  >
                    {loadingAccountVideos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Importar Todos os Vídeos
                      </>
                    )}
                  </Button>

                  {formData.links.length > 0 && formData.links[0] !== "" && (
                    <Alert>
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        {formData.links.length} vídeo(s) importado(s) e pronto(s) para enviar
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="links" className="space-y-4 mt-4">
                  {selectedPlatformAccounts.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Contas cadastradas: {selectedPlatformAccounts.map(a => `@${a.username}`).join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {formData.links.map((link, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`link-${index}`}>
                              Link {index + 1}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`link-${index}`}
                                placeholder={`Cole o link do ${
                                  platforms.find((p) => p.id === formData.platform)?.name
                                }`}
                                value={link}
                                onChange={(e) => updateLink(index, e.target.value)}
                                className={`flex-1 ${
                                  linkErrors[index] && !validatedLinks[index]?.valid 
                                    ? "border-destructive" 
                                    : validatedLinks[index]?.valid && !validatedLinks[index]?.apiError
                                      ? "border-green-500" 
                                      : validatedLinks[index]?.valid && validatedLinks[index]?.apiError
                                        ? "border-yellow-500"
                                        : ""
                                }`}
                              />
                              <Button
                                type="button"
                                variant={validatedLinks[index]?.valid ? "outline" : "secondary"}
                                onClick={() => handleValidateLink(index)}
                                disabled={!link.trim() || validatingLinks[index]}
                                className={`min-w-[100px] ${
                                  validatedLinks[index]?.valid && !validatedLinks[index]?.apiError
                                    ? "border-green-500 text-green-500" 
                                    : validatedLinks[index]?.valid && validatedLinks[index]?.apiError
                                      ? "border-yellow-500 text-yellow-500"
                                      : ""
                                }`}
                              >
                                {validatingLinks[index] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : validatedLinks[index]?.valid && !validatedLinks[index]?.apiError ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Válido
                                  </>
                                ) : validatedLinks[index]?.valid && validatedLinks[index]?.apiError ? (
                                  <>
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Pendente
                                  </>
                                ) : (
                                  "Validar"
                                )}
                              </Button>
                            </div>
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
                        {validatedLinks[index]?.valid && validatedLinks[index]?.username && !validatedLinks[index]?.apiError && (
                          <p className="text-xs text-green-500">
                            ✓ Vídeo de @{validatedLinks[index].username} verificado
                          </p>
                        )}
                        {validatedLinks[index]?.valid && validatedLinks[index]?.apiError && linkErrors[index] && (
                          <p className="text-xs text-yellow-500">⚠ {linkErrors[index]}</p>
                        )}
                        {!validatedLinks[index]?.valid && linkErrors[index] && (
                          <p className="text-xs text-destructive">{linkErrors[index]}</p>
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
                </TabsContent>
              </Tabs>
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
