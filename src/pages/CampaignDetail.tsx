import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfessionalRanking } from "@/components/Ranking/ProfessionalRanking";
import MainLayout from "@/components/Layout/MainLayout";
import { cn } from "@/lib/utils";
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
  RefreshCw,
  Loader2,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  Heart,
  MessageCircle,
  FileText,
  Hash,
} from "lucide-react";
import { SiTiktok, SiYoutube } from "react-icons/si";
import { format, differenceInDays, isPast } from "date-fns";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

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
        
        setVideos(videos.map(v => 
          v.id === video.id ? { ...v, ...updatedMetrics } : v
        ).sort((a, b) => (b.views || 0) - (a.views || 0)));
        
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
          body: { videoUrl: video.video_link },
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
            errorCount++;
          } else {
            setVideos(prev => prev.map(v => 
              v.id === video.id ? { ...v, ...updatedMetrics } : v
            ));
            successCount++;
          }
        } else if (data?.invalidUrl) {
          invalidUrlCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    await fetchCampaignData();
    setSyncingMetrics(false);
    
    if (successCount > 0) toast.success(`${successCount} ${t('campaign.videos_updated')}`);
    if (invalidUrlCount > 0) toast.warning(`${invalidUrlCount} ${t('campaign.invalid_links')}`);
    if (errorCount > 0) toast.error(`${errorCount} ${t('campaign.videos_error')}`);
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

      const { data: videosData } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", id);

      if (videosData && videosData.length > 0) {
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-[60vh] text-center"
        >
          <Trophy className="h-20 w-20 text-muted-foreground/30 mb-6" />
          <h2 className="text-2xl font-bold mb-2">{t('campaign.not_found')}</h2>
          <p className="text-muted-foreground mb-6">A campanha que você procura não existe</p>
          <Button onClick={() => navigate("/campaigns")} size="lg">
            {t('campaign.back_to_campaigns')}
          </Button>
        </motion.div>
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

  const getPlatformColor = (platform: string) => {
    if (platform === "instagram") return "text-pink-400";
    if (platform === "tiktok") return "text-cyan-400";
    if (platform === "youtube") return "text-red-500";
    return "text-muted-foreground";
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
  const totalParticipants = new Set(videos.map(v => v.username)).size;
  
  const daysRemaining = differenceInDays(new Date(campaign.end_date), new Date());
  const isEnded = isPast(new Date(campaign.end_date));
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : "0";

  return (
    <MainLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Hero Header */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6 md:p-8"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
          </div>
          
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Side - Campaign Info */}
            <div className="flex items-start gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(getBackPath())}
                className="rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                    {campaign.name}
                  </h1>
                  <Badge 
                    className={cn(
                      "px-3 py-1 text-sm font-medium gap-1.5",
                      campaign.is_active 
                        ? "bg-green-500/20 text-green-400 border-green-500/30" 
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      campaign.is_active ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
                    )} />
                    {campaign.is_active ? t('campaign.active_status') : t('campaign.ended_status')}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {/* Date Range */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm border border-border/50">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {format(new Date(campaign.start_date), "dd MMM", { locale: dateLocale })} - {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: dateLocale })}
                    </span>
                  </div>
                  
                  {/* Time Remaining */}
                  {!isEnded && campaign.is_active && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
                      <Clock className="h-4 w-4 text-orange-400" />
                      <span className="text-orange-400 font-medium">
                        {daysRemaining} {language === 'pt' ? 'dias restantes' : 'days left'}
                      </span>
                    </div>
                  )}
                  
                  {/* Platforms */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm border border-border/50">
                    {campaignPlatforms.map((platform) => {
                      const Icon = getPlatformIcon(platform);
                      return (
                        <Icon 
                          key={platform} 
                          className={cn("h-4 w-4", getPlatformColor(platform))} 
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Hashtags */}
                {campaign.hashtags && campaign.hashtags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    {campaign.hashtags.slice(0, 5).map((tag, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side - Admin Actions */}
            {(isAdmin || isOwner) && (
              <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/edit-campaign/${campaign.id}`)}
                  className="gap-2 bg-background/50 backdrop-blur-sm"
                >
                  <Edit className="h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <Button
                  variant={campaign.is_active ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleStatus}
                  className={cn(
                    "gap-2",
                    !campaign.is_active && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {campaign.is_active ? (
                    <>
                      <Pause className="h-4 w-4" />
                      {t('campaigns.pause')}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {t('campaigns.activate')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {[
            { 
              label: t('campaign.total_views'), 
              value: formatNumber(totalViews), 
              icon: Eye, 
              color: "green",
              gradient: "from-green-500/20 to-emerald-500/10",
              iconBg: "bg-green-500/15",
              iconColor: "text-green-400"
            },
            { 
              label: t('campaign.recognized_videos'), 
              value: videos.length.toString(), 
              icon: Video, 
              color: "blue",
              gradient: "from-blue-500/20 to-cyan-500/10",
              iconBg: "bg-blue-500/15",
              iconColor: "text-blue-400"
            },
            { 
              label: t('campaigns.participants'), 
              value: totalParticipants.toString(), 
              icon: Users, 
              color: "purple",
              gradient: "from-purple-500/20 to-pink-500/10",
              iconBg: "bg-purple-500/15",
              iconColor: "text-purple-400"
            },
            { 
              label: "Total Likes", 
              value: formatNumber(totalLikes), 
              icon: Heart, 
              color: "red",
              gradient: "from-red-500/20 to-pink-500/10",
              iconBg: "bg-red-500/15",
              iconColor: "text-red-400"
            },
            { 
              label: "Comentários", 
              value: formatNumber(totalComments), 
              icon: MessageCircle, 
              color: "cyan",
              gradient: "from-cyan-500/20 to-blue-500/10",
              iconBg: "bg-cyan-500/15",
              iconColor: "text-cyan-400"
            },
            { 
              label: "Engajamento", 
              value: `${engagementRate}%`, 
              icon: TrendingUp, 
              color: "amber",
              gradient: "from-amber-500/20 to-orange-500/10",
              iconBg: "bg-amber-500/15",
              iconColor: "text-amber-400"
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4",
                "bg-gradient-to-br backdrop-blur-sm",
                stat.gradient,
                `border-${stat.color}-500/20`
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={cn("p-2 rounded-xl", stat.iconBg)}>
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Info */}
          <motion.div variants={containerVariants} className="space-y-6">
            {/* Description */}
            {campaign.description && (
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{t('campaign.about')}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {campaign.description}
                </p>
              </motion.div>
            )}

            {/* Prize */}
            {campaign.prize_description && (
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6"
              >
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-2 right-2"
                >
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </motion.div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
                    <Award className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-400 mb-2">{t('campaign.prizes')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{campaign.prize_description}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rules */}
            {campaign.rules && (
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{t('campaigns.rules')}</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {campaign.rules}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Ranking */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-card/50 p-6 backdrop-blur-sm">
              {/* Sync Button */}
              {(isAdmin || isOwner) && videos.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAllMetrics}
                    disabled={syncingMetrics}
                    className="gap-2"
                  >
                    {syncingMetrics ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {syncingMetrics ? t('campaign.syncing') : t('campaign.sync_all')}
                  </Button>
                </div>
              )}

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
            </div>
          </motion.div>
        </div>
      </motion.div>
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
