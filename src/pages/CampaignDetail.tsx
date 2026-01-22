import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlowCard } from "@/components/ui/GlowCard";
import { ProfessionalRanking } from "@/components/Ranking/ProfessionalRanking";
import MainLayout from "@/components/Layout/MainLayout";
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
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Award,
  Users,
  Video,
  Eye,
  Instagram,
  Edit,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { SiTiktok, SiYoutube } from "react-icons/si";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  prize_description: string;
  rules: string;
  is_active: boolean;
  hashtags: string[];
}

interface CampaignVideo {
  id: string;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  submitted_at: string;
  submitted_by: string;
  verified: boolean;
  username?: string;
  hashtags?: string[];
}

function CampaignDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast: toastHook } = useToast();
  const { user, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  
  const dateLocale = language === 'pt' ? ptBR : enUS;

  // Determine the correct back navigation path
  const getBackPath = () => {
    const referrer = location.state?.from;
    if (referrer) return referrer;
    if (isAdmin) return "/admin/campaigns";
    if (isOwner) return "/client/campaigns";
    return "/campaigns";
  };

  useEffect(() => {
    fetchCampaignData();
    checkOwnership();
  }, [id, user]);

  const checkOwnership = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("campaign_owners")
      .select("id")
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setIsOwner(!!data);
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);

      if (error) throw error;
      toast.success(campaign.is_active ? t('campaign.paused') : t('campaign.activated'));
      setCampaign({ ...campaign, is_active: !campaign.is_active });
    } catch (error: any) {
      toast.error(error.message || t('campaign.error_update_status'));
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      const { error } = await supabase
        .from("campaign_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;
      
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success(t('campaign.video_removed'));
    } catch (error: any) {
      toast.error(error.message || t('campaign.error_remove_video'));
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleSyncVideoMetrics = async (video: CampaignVideo) => {
    try {
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: { 
          videoUrl: video.video_link,
          updateDatabase: true,
          tableId: video.id
        },
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        const updatedMetrics = {
          views: data.data.viewsCount || 0,
          likes: data.data.likesCount || 0,
          comments: data.data.commentsCount || 0,
          shares: data.data.sharesCount || 0,
        };
        
        // Update local state
        setVideos(videos.map(v => 
          v.id === video.id ? { ...v, ...updatedMetrics } : v
        ).sort((a, b) => (b.views || 0) - (a.views || 0)));
        
        // Update database
        await supabase
          .from("campaign_videos")
          .update(updatedMetrics)
          .eq("id", video.id);
          
        toast.success(t('campaign.metrics_updated'));
      }
    } catch (error: any) {
      console.error("Error syncing metrics:", error);
      toast.error(t('campaign.error_sync_metrics'));
    }
  };

  const handleSyncAllMetrics = async () => {
    setSyncingMetrics(true);
    let successCount = 0;
    let errorCount = 0;
    let invalidUrlCount = 0;

    for (const video of videos) {
      try {
        const { data, error } = await supabase.functions.invoke('video-details', {
          body: { 
            videoUrl: video.video_link,
          },
        });

        if (!error && data?.success && data?.data) {
          const updatedMetrics = {
            views: data.data.viewsCount || 0,
            likes: data.data.likesCount || 0,
            comments: data.data.commentsCount || 0,
            shares: data.data.sharesCount || 0,
          };
          
          const { error: updateError } = await supabase
            .from("campaign_videos")
            .update(updatedMetrics)
            .eq("id", video.id);
          
          if (updateError) {
            console.error(`Error updating video ${video.id}:`, updateError);
            errorCount++;
          } else {
            // Update local state immediately
            setVideos(prev => prev.map(v => 
              v.id === video.id 
                ? { ...v, ...updatedMetrics }
                : v
            ));
            successCount++;
          }
        } else if (data?.invalidUrl) {
          // URL is invalid (e.g., profile URL instead of video URL)
          invalidUrlCount++;
          console.warn(`Invalid URL for video ${video.id}: ${video.video_link}`);
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    // Refresh data
    await fetchCampaignData();
    setSyncingMetrics(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} ${t('campaign.videos_updated')}`);
    }
    if (invalidUrlCount > 0) {
      toast.warning(`${invalidUrlCount} ${t('campaign.invalid_links')} (${t('campaign.profile_url_not_allowed')})`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ${t('campaign.videos_error')}`);
    }
  };

  const fetchCampaignData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch videos submitted to this campaign - use stored data from campaign_videos table
      const { data: videosData } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", id);

      if (videosData && videosData.length > 0) {
        // Get usernames for all submitted_by users
        const userIds = [...new Set(videosData?.map(v => v.submitted_by).filter(Boolean))];
        let usernamesMap: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
          
          if (profiles) {
            usernamesMap = Object.fromEntries(profiles.map(p => [p.id, p.username]));
          }
        }

        // Process videos using stored metrics from campaign_videos table
        const processedVideos = videosData.map((video) => ({
          id: video.id,
          video_link: video.video_link,
          platform: video.platform,
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          submitted_at: video.submitted_at,
          submitted_by: video.submitted_by,
          verified: video.verified,
          username: usernamesMap[video.submitted_by] || `${t('campaign.participant')} #${video.id.slice(0, 4)}`,
        })).sort((a, b) => (b.views || 0) - (a.views || 0));

        setVideos(processedVideos);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toastHook({
        title: t('campaign.error_loading'),
        description: t('msg.error_loading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('campaign.not_found')}</h2>
          <Button onClick={() => navigate("/campaigns")} className="mt-4">
            {t('campaign.back_to_campaigns')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const campaignPlatforms = campaign.platforms || [campaign.platform];
  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") return Instagram;
    if (platform === "tiktok") return SiTiktok;
    if (platform === "youtube") return SiYoutube;
    return Video;
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalParticipants = new Set(videos.map(v => v.username)).size;

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(getBackPath())}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                <Badge className={campaign.is_active ? "bg-green-500/20 text-green-400" : "bg-muted"}>
                  {campaign.is_active ? t('campaign.active_status') : t('campaign.ended_status')}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(campaign.start_date), "dd MMM", { locale: dateLocale })} - {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: dateLocale })}
                </div>
                <div className="flex items-center gap-1">
                  {campaignPlatforms.map((platform) => {
                    const Icon = getPlatformIcon(platform);
                    return <Icon key={platform} className="h-4 w-4" />;
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Admin Actions - Only for admins */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/edit-campaign/${campaign.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </Button>
              <Button
                variant={campaign.is_active ? "outline" : "default"}
                size="sm"
                onClick={handleToggleStatus}
              >
                {campaign.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    {t('campaigns.pause')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('campaigns.activate')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Hashtags Badge */}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowCard glowColor="green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{t('campaign.total_views')}</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(totalViews)}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/15">
                <Eye className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard glowColor="blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{t('campaign.recognized_videos')}</p>
                <p className="text-3xl font-bold mt-1">{videos.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/15">
                <Video className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard glowColor="purple">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{t('campaigns.participants')}</p>
                <p className="text-3xl font-bold mt-1">{totalParticipants}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/15">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Info */}
          <div className="space-y-6">
            {/* Description */}
            {campaign.description && (
              <GlowCard>
                <h3 className="font-semibold mb-3">{t('campaign.about')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {campaign.description}
                </p>
              </GlowCard>
            )}

            {/* Prize */}
            {campaign.prize_description && (
              <GlowCard glowColor="orange">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/15">
                    <Award className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('campaign.prizes')}</h3>
                    <p className="text-sm text-muted-foreground">{campaign.prize_description}</p>
                  </div>
                </div>
              </GlowCard>
            )}

            {/* Rules */}
            {campaign.rules && (
              <GlowCard>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  {t('campaigns.rules')}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {campaign.rules}
                </p>
              </GlowCard>
            )}
          </div>

          {/* Right Column - Ranking */}
          <div className="lg:col-span-2">
            <GlowCard>
              <div className="flex items-center justify-between mb-6">
                <div /> {/* Spacer for alignment */}
                {(isAdmin || isOwner) && videos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAllMetrics}
                    disabled={syncingMetrics}
                  >
                    {syncingMetrics ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {syncingMetrics ? t('campaign.syncing') : t('campaign.sync_all')}
                  </Button>
                )}
              </div>

              <ProfessionalRanking
                videos={videos.slice(0, 15).map(v => ({
                  id: v.id,
                  video_link: v.video_link,
                  platform: v.platform,
                  views: v.views,
                  likes: v.likes,
                  comments: v.comments,
                  shares: v.shares,
                  username: v.username,
                }))}
                title={t('campaign.video_ranking')}
                maxItems={15}
                showActions={isAdmin || isOwner}
                onSync={(video) => {
                  const fullVideo = videos.find(v => v.id === video.id);
                  if (fullVideo) handleSyncVideoMetrics(fullVideo);
                }}
                onDelete={(video) => handleDeleteVideo(video.id)}
                syncing={syncingMetrics}
              />
            </GlowCard>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function CampaignDetail() {
  return (
    <ProtectedRoute>
      <CampaignDetailContent />
    </ProtectedRoute>
  );
}
