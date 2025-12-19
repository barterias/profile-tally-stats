import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlowCard } from "@/components/ui/GlowCard";
import MainLayout from "@/components/Layout/MainLayout";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Award,
  Users,
  Video,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Instagram,
  Music,
  Youtube,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<CampaignVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch all videos from external API and match by hashtags
      const [allInstagramVideos, allTikTokVideos, allYoutubeVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
        externalSupabase.getYoutubeVideos(),
      ]);

      const campaignHashtags = (campaignData.hashtags || []).map((h: string) => h.toLowerCase().replace('#', ''));
      
      if (campaignHashtags.length === 0) {
        // If no hashtags configured, fall back to campaign_videos table
        const { data: videosData } = await supabase
          .from("campaign_videos")
          .select("*")
          .eq("campaign_id", id);

        if (videosData && videosData.length > 0) {
          const processedVideos = await processVideosWithMetrics(videosData, allInstagramVideos, allTikTokVideos, allYoutubeVideos);
          setVideos(processedVideos);
        } else {
          setVideos([]);
        }
      } else {
        // Match videos by hashtags from external API
        const matchedVideos: CampaignVideo[] = [];

        // Process Instagram videos
        allInstagramVideos?.forEach((video: any) => {
          const videoHashtags = extractHashtagsFromTitle(video.title || video.caption || '');
          if (hasMatchingHashtag(videoHashtags, campaignHashtags)) {
            matchedVideos.push({
              id: video.id?.toString() || `ig-${Date.now()}-${Math.random()}`,
              video_link: video.link || video.video_url || '',
              platform: 'instagram',
              views: video.views || 0,
              likes: video.likes || 0,
              comments: video.comments || 0,
              shares: video.shares || 0,
              submitted_at: video.inserted_at || video.collected_at || new Date().toISOString(),
              submitted_by: video.creator_username || 'unknown',
              verified: true,
              username: video.creator_username || video.creator_nickname || 'Participante',
              hashtags: videoHashtags,
            });
          }
        });

        // Process TikTok videos
        allTikTokVideos?.forEach((video: any) => {
          const videoHashtags = extractHashtagsFromTitle(video.title || video.music_title || '');
          if (hasMatchingHashtag(videoHashtags, campaignHashtags)) {
            matchedVideos.push({
              id: video.id?.toString() || `tt-${Date.now()}-${Math.random()}`,
              video_link: video.link || video.video_url || '',
              platform: 'tiktok',
              views: video.views || 0,
              likes: video.likes || 0,
              comments: video.comments || 0,
              shares: video.shares || 0,
              submitted_at: video.inserted_at || new Date().toISOString(),
              submitted_by: video.creator_username || 'unknown',
              verified: true,
              username: video.creator_username || video.creator_nickname || 'Participante',
              hashtags: videoHashtags,
            });
          }
        });

        // Process YouTube videos
        allYoutubeVideos?.forEach((video: any) => {
          const videoHashtags = extractHashtagsFromTitle(video.title || '');
          if (hasMatchingHashtag(videoHashtags, campaignHashtags)) {
            matchedVideos.push({
              id: video.id?.toString() || `yt-${Date.now()}-${Math.random()}`,
              video_link: video.link || `https://youtube.com/shorts/${video.youtube_id}`,
              platform: 'youtube',
              views: video.views || 0,
              likes: video.likes || 0,
              comments: video.comments || 0,
              shares: video.shares || 0,
              submitted_at: video.inserted_at || new Date().toISOString(),
              submitted_by: video.channel_name || 'unknown',
              verified: true,
              username: video.channel_name || video.creator_nickname || 'Participante',
              hashtags: videoHashtags,
            });
          }
        });

        // Sort by views
        matchedVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
        setVideos(matchedVideos);
      }
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      toast({
        title: "Erro ao carregar campanha",
        description: "Não foi possível carregar os dados da campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractHashtagsFromTitle = (title: string): string[] => {
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    const matches = title.match(hashtagRegex) || [];
    return matches.map(h => h.toLowerCase().replace('#', ''));
  };

  const hasMatchingHashtag = (videoHashtags: string[], campaignHashtags: string[]): boolean => {
    return videoHashtags.some(vh => campaignHashtags.includes(vh));
  };

  const processVideosWithMetrics = async (
    videosData: any[],
    allInstagramVideos: any[],
    allTikTokVideos: any[],
    allYoutubeVideos: any[]
  ): Promise<CampaignVideo[]> => {
    const normalizeLink = (link: string): string => {
      if (!link) return '';
      return link
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .trim();
    };

    const extractVideoId = (link: string): string | null => {
      if (!link) return null;
      const instaMatch = link.match(/\/(reels?|p)\/([A-Za-z0-9_-]+)/);
      if (instaMatch) return instaMatch[2];
      const tiktokMatch = link.match(/\/video\/(\d+)/);
      if (tiktokMatch) return tiktokMatch[1];
      return null;
    };

    const extractYoutubeId = (link: string): string | null => {
      if (!link) return null;
      const watchMatch = link.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
      if (watchMatch) return watchMatch[1];
      const shortsMatch = link.match(/\/shorts\/([A-Za-z0-9_-]+)/i);
      if (shortsMatch) return shortsMatch[1].split('?')[0];
      const shortMatch = link.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
      if (shortMatch) return shortMatch[1].split('?')[0];
      return null;
    };

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

    return videosData.map((video) => {
      const normalizedCampaignLink = normalizeLink(video.video_link);
      let metrics = { views: 0, likes: 0, comments: 0, shares: 0 };
      
      if (video.platform === "instagram") {
        const match = allInstagramVideos?.find(v => {
          const dbLink = normalizeLink(v.link || v.video_url || '');
          return dbLink === normalizedCampaignLink || 
                 dbLink.includes(normalizedCampaignLink) || 
                 normalizedCampaignLink.includes(dbLink);
        });

        if (match) {
          metrics = {
            views: match.views || 0,
            likes: match.likes || 0,
            comments: match.comments || 0,
            shares: match.shares || 0,
          };
        } else {
          const videoId = extractVideoId(video.video_link);
          if (videoId) {
            const matchById = allInstagramVideos?.find(v => {
              const dbId = extractVideoId(v.link || v.video_url || '');
              return dbId === videoId;
            });
            if (matchById) {
              metrics = {
                views: matchById.views || 0,
                likes: matchById.likes || 0,
                comments: matchById.comments || 0,
                shares: matchById.shares || 0,
              };
            }
          }
        }
      } else if (video.platform === "tiktok") {
        const videoId = extractVideoId(video.video_link);
        
        if (videoId) {
          const matchById = allTikTokVideos?.find(v => 
            v.video_id === videoId || v.video_id === `=${videoId}`
          );
          if (matchById) {
            metrics = {
              views: matchById.views || 0,
              likes: matchById.likes || 0,
              comments: matchById.comments || 0,
              shares: matchById.shares || 0,
            };
          }
        }
      } else if (video.platform === "youtube") {
        const youtubeId = extractYoutubeId(video.video_link);
        
        if (youtubeId && allYoutubeVideos) {
          const matchById = allYoutubeVideos.find(v => {
            const externalId = (v.youtube_id || v.video_id || '').replace(/^=/, '');
            return externalId.toLowerCase() === youtubeId.toLowerCase();
          });
          
          if (matchById) {
            metrics = {
              views: matchById.views || 0,
              likes: matchById.likes || 0,
              comments: matchById.comments || 0,
              shares: matchById.shares || 0,
            };
          }
        }
      }
      
      return {
        ...video,
        ...metrics,
        username: usernamesMap[video.submitted_by] || `Participante #${video.id.slice(0, 4)}`,
      };
    }).sort((a, b) => (b.views || 0) - (a.views || 0));
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
          <h2 className="text-2xl font-bold mb-2">Campanha não encontrada</h2>
          <Button onClick={() => navigate("/campaigns")} className="mt-4">
            Voltar para Campanhas
          </Button>
        </div>
      </MainLayout>
    );
  }

  const campaignPlatforms = campaign.platforms || [campaign.platform];
  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") return Instagram;
    if (platform === "tiktok") return Music;
    if (platform === "youtube") return Youtube;
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                <Badge className={campaign.is_active ? "bg-green-500/20 text-green-400" : "bg-muted"}>
                  {campaign.is_active ? "Ativa" : "Encerrada"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
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
        </div>

        {/* Hashtags Badge */}
        {campaign.hashtags && campaign.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              Hashtags:
            </div>
            {campaign.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                #{tag.replace('#', '')}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowCard glowColor="green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Views Totais</p>
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
                <p className="text-sm text-muted-foreground font-medium">Vídeos Reconhecidos</p>
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
                <p className="text-sm text-muted-foreground font-medium">Participantes</p>
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
                <h3 className="font-semibold mb-3">Sobre a Campanha</h3>
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
                    <h3 className="font-semibold mb-1">Prêmios</h3>
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
                  Regras
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
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking de Vídeos
              </h3>

              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum vídeo reconhecido ainda</p>
                  {campaign.hashtags && campaign.hashtags.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Use as hashtags: {campaign.hashtags.map(h => `#${h.replace('#', '')}`).join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div
                      key={video.id}
                      className={`p-4 rounded-xl transition-all hover:scale-[1.01] ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                          : index === 1
                          ? "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border border-gray-400/20"
                          : index === 2
                          ? "bg-gradient-to-r from-orange-600/10 to-orange-700/10 border border-orange-600/20"
                          : "bg-muted/30 border border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Position */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : index === 1
                            ? "bg-gray-400/20 text-gray-300"
                            : index === 2
                            ? "bg-orange-600/20 text-orange-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.username}</p>
                          <a
                            href={video.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary/70 hover:text-primary hover:underline truncate block"
                          >
                            Ver vídeo ↗
                          </a>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <Eye className="h-3.5 w-3.5 text-green-400" />
                            <span className="font-semibold">{formatNumber(video.views)}</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <Heart className="h-3.5 w-3.5 text-red-400" />
                            <span>{formatNumber(video.likes)}</span>
                          </div>
                          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                            <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                            <span>{formatNumber(video.comments)}</span>
                          </div>
                          {video.shares > 0 && (
                            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50">
                              <Share2 className="h-3.5 w-3.5 text-purple-400" />
                              <span>{formatNumber(video.shares)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
