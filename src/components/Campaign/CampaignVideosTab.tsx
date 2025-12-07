import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { GlowCard } from "@/components/ui/GlowCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Search,
  ExternalLink,
  RefreshCw,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoWithMetrics {
  id: string;
  video_link: string;
  platform: string;
  submitted_at: string;
  submitted_by: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  thumbnail?: string;
  title?: string;
  creator_username?: string;
}

interface CampaignVideosTabProps {
  campaignId: string;
}

export function CampaignVideosTab({ campaignId }: CampaignVideosTabProps) {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoWithMetrics[]>([]);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const normalizeLink = (link: string): string => {
    if (!link) return "";
    return link.split("?")[0].replace(/\/$/, "").toLowerCase();
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      // Fetch campaign videos
      const { data: campaignVideos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("submitted_at", { ascending: false });

      if (!campaignVideos || campaignVideos.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Fetch external metrics
      const [externalVideos, socialVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);

      // Create metrics map
      const metricsMap = new Map<string, any>();
      for (const v of [...externalVideos, ...socialVideos]) {
        const link = normalizeLink(v.link || v.video_url);
        if (link) {
          metricsMap.set(link, v);
        }
      }

      // Map videos with metrics
      const videosWithMetrics: VideoWithMetrics[] = campaignVideos.map((video) => {
        const normalized = normalizeLink(video.video_link);
        const metrics = metricsMap.get(normalized);
        
        return {
          id: video.id,
          video_link: video.video_link,
          platform: video.platform,
          submitted_at: video.submitted_at,
          submitted_by: video.submitted_by || "",
          views: metrics?.views || 0,
          likes: metrics?.likes || 0,
          comments: metrics?.comments || 0,
          shares: metrics?.shares || 0,
          thumbnail: metrics?.thumbnail || metrics?.post_image,
          title: metrics?.title,
          creator_username: metrics?.creator_username,
        };
      });

      setVideos(videosWithMetrics);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchVideos();
    }
  }, [campaignId]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = 
      video.video_link.toLowerCase().includes(search.toLowerCase()) ||
      video.creator_username?.toLowerCase().includes(search.toLowerCase()) ||
      video.title?.toLowerCase().includes(search.toLowerCase());
    
    const matchesPlatform = platformFilter === "all" || video.platform === platformFilter;
    
    return matchesSearch && matchesPlatform;
  });

  const platforms = [...new Set(videos.map(v => v.platform))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por link, título ou criador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/50 border-border/50"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchVideos} size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
          <p className="text-2xl font-bold">{filteredVideos.length}</p>
          <p className="text-xs text-muted-foreground">Vídeos</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {formatNumber(filteredVideos.reduce((sum, v) => sum + v.views, 0))}
          </p>
          <p className="text-xs text-muted-foreground">Views Total</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
          <p className="text-2xl font-bold text-red-400">
            {formatNumber(filteredVideos.reduce((sum, v) => sum + v.likes, 0))}
          </p>
          <p className="text-xs text-muted-foreground">Likes Total</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
          <p className="text-2xl font-bold text-green-400">
            {formatNumber(filteredVideos.reduce((sum, v) => sum + v.comments, 0))}
          </p>
          <p className="text-xs text-muted-foreground">Comentários</p>
        </div>
      </div>

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum vídeo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 transition-colors"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title || "Video"}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {video.creator_username && (
                      <p className="text-sm text-muted-foreground">@{video.creator_username}</p>
                    )}
                    {video.title && (
                      <p className="font-medium truncate">{video.title}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {video.platform}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1 text-blue-400">
                    <Eye className="h-4 w-4" />
                    {formatNumber(video.views)}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <Heart className="h-4 w-4" />
                    {formatNumber(video.likes)}
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <MessageCircle className="h-4 w-4" />
                    {formatNumber(video.comments)}
                  </span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <Share2 className="h-4 w-4" />
                    {formatNumber(video.shares)}
                  </span>
                </div>

                {/* Date and Link */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(video.submitted_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <a
                    href={video.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver vídeo
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
