import { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVideoDetails } from '@/hooks/useVideoDetails';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Video {
  id: string;
  title?: string | null;
  caption?: string | null;
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  videoUrl: string;
  postedAt?: string | null;
}

interface AccountVideosModalProps {
  platform: 'instagram' | 'youtube' | 'tiktok';
  accountName: string;
  videos: Video[];
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
}

const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const platformLabels = {
  instagram: 'Posts',
  youtube: 'Vídeos',
  tiktok: 'Vídeos',
};

export function AccountVideosModal({
  platform,
  accountName,
  videos,
  isLoading,
  open,
  onOpenChange,
  accountId,
}: AccountVideosModalProps) {
  const [syncingVideoId, setSyncingVideoId] = useState<string | null>(null);
  const { mutateAsync: fetchVideoDetails } = useVideoDetails();
  const queryClient = useQueryClient();

  // Sort videos by views (highest first)
  const sortedVideos = [...videos].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));

  const handleSyncVideo = async (video: Video, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSyncingVideoId(video.id);
    
    try {
      await fetchVideoDetails({
        videoUrl: video.videoUrl,
        updateDatabase: true,
        tableId: video.id,
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`${platform}-videos`, accountId] });
    } catch (error) {
      console.error('Error syncing video:', error);
    } finally {
      setSyncingVideoId(null);
    }
  };

  const handleOpenVideo = (e: React.MouseEvent, videoUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening video URL:', videoUrl);
    
    if (videoUrl) {
      const newWindow = window.open(videoUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // Fallback if popup is blocked
        window.location.href = videoUrl;
      }
    } else {
      toast.error('Link do vídeo não disponível');
    }
  };

  const renderThumbnail = (video: Video) => (
    <div className="aspect-video bg-muted relative overflow-hidden">
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title || video.caption || 'Video thumbnail'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <Eye className="h-8 w-8" />
        </div>
      )}
      {/* Views badge */}
      <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
        <Eye className="h-3 w-3 mr-1" />
        {formatNumber(video.viewsCount)}
      </Badge>
      {/* External link indicator */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge className="bg-primary text-primary-foreground">
          <ExternalLink className="h-3 w-3 mr-1" />
          Abrir
        </Badge>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{platformLabels[platform]} de @{accountName}</DialogTitle>
          <DialogDescription>
            {videos.length} {platformLabels[platform].toLowerCase()} encontrados. Clique em qualquer vídeo para abrir no {platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : 'TikTok'}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-video rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : sortedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">Nenhum {platformLabels[platform].toLowerCase()} encontrado</p>
                <p className="text-sm mt-1">Sincronize a conta para buscar os vídeos</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedVideos.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all overflow-hidden"
                >
                  {/* Clickable Thumbnail Area */}
                  <a 
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer block"
                    onClick={(e) => handleOpenVideo(e, video.videoUrl)}
                  >
                    {renderThumbnail(video)}
                  </a>

                  {/* Content */}
                  <div className="p-3 space-y-2">
                    {/* Title or Caption - Clickable */}
                    <a 
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer hover:text-primary transition-colors block"
                      onClick={(e) => handleOpenVideo(e, video.videoUrl)}
                    >
                      <p className="font-medium text-sm line-clamp-2 text-foreground">
                        {video.title || video.caption || 'Sem título'}
                      </p>
                    </a>

                    {/* Metrics and Sync Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{formatNumber(video.likesCount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{formatNumber(video.commentsCount)}</span>
                        </div>
                        {video.sharesCount !== undefined && video.sharesCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            <span>{formatNumber(video.sharesCount)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Sync button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleSyncVideo(video, e)}
                        disabled={syncingVideoId === video.id}
                        title="Atualizar visualizações"
                      >
                        {syncingVideoId === video.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
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
