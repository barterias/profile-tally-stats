import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  Check, 
  X, 
  ExternalLink, 
  Eye, 
  Heart, 
  MessageCircle,
  Video,
  RefreshCw 
} from "lucide-react";

interface PendingVideosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  campaignName?: string;
}

interface PendingVideo {
  id: string;
  video_link: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  submitted_at: string;
  verified: boolean;
  submitted_by: string;
  username?: string;
  avatar_url?: string;
}

export function PendingVideosModal({ open, onOpenChange, campaignId, campaignName }: PendingVideosModalProps) {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (open && campaignId) {
      fetchPendingVideos();
    }
  }, [open, campaignId]);

  const fetchPendingVideos = async () => {
    setLoading(true);
    try {
      const { data: videosData, error } = await supabase
        .from('campaign_videos')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('verified', false)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for submitted_by
      const userIds = [...new Set((videosData || []).map(v => v.submitted_by).filter(Boolean))];
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profiles = data || [];
      }

      const profilesMap = new Map(profiles.map(p => [p.id, p]));

      const videosWithProfiles = (videosData || []).map(v => ({
        ...v,
        username: profilesMap.get(v.submitted_by)?.username || 'Usuário',
        avatar_url: profilesMap.get(v.submitted_by)?.avatar_url,
      }));

      setVideos(videosWithProfiles);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    setProcessing(videoId);
    try {
      const { error } = await supabase
        .from('campaign_videos')
        .update({ verified: true })
        .eq('id', videoId);

      if (error) throw error;
      
      toast.success('Vídeo aprovado!');
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar vídeo');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (videoId: string) => {
    setProcessing(videoId);
    try {
      const { error } = await supabase
        .from('campaign_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      
      toast.success('Vídeo rejeitado e removido');
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar vídeo');
    } finally {
      setProcessing(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'bg-pink-500/20 text-pink-400';
      case 'tiktok': return 'bg-purple-500/20 text-purple-400';
      case 'youtube': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Vídeos Pendentes
              {campaignName && (
                <span className="text-muted-foreground font-normal">- {campaignName}</span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={fetchPendingVideos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum vídeo pendente de aprovação</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                        {video.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{video.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(video.submitted_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getPlatformColor(video.platform)}>
                      {video.platform}
                    </Badge>
                  </div>

                  {/* Video Link */}
                  <a
                    href={video.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    {video.video_link}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(video.views || 0)} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(video.likes || 0)} likes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {video.comments || 0} comentários
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(video.id)}
                      disabled={processing === video.id}
                    >
                      {processing === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(video.id)}
                      disabled={processing === video.id}
                    >
                      {processing === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
