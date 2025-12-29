import { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, RefreshCw, Loader2, ExternalLink, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useVideoDetails } from '@/hooks/useVideoDetails';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AddVideoByLinkModal } from './AddVideoByLinkModal';

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
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [addByLinkOpen, setAddByLinkOpen] = useState(false);
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

  const handleSyncAllVideos = async () => {
    if (sortedVideos.length === 0) return;
    
    setSyncingAll(true);
    setSyncProgress({ current: 0, total: sortedVideos.length });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sortedVideos.length; i++) {
      const video = sortedVideos[i];
      setSyncProgress({ current: i + 1, total: sortedVideos.length });
      
      try {
        await fetchVideoDetails({
          videoUrl: video.videoUrl,
          updateDatabase: true,
          tableId: video.id,
        });
        successCount++;
      } catch (error) {
        console.error(`Error syncing video ${video.id}:`, error);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      if (i < sortedVideos.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: [`${platform}-videos`, accountId] });
    queryClient.invalidateQueries({ queryKey: [`${platform}-videos-all`] });
    queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    
    setSyncingAll(false);
    setSyncProgress({ current: 0, total: 0 });
    
    if (errorCount === 0) {
      toast.success(`${successCount} vídeos sincronizados com sucesso!`);
    } else {
      toast.warning(`${successCount} sincronizados, ${errorCount} com erro`);
    }
  };

  // Build proper video URL based on platform
  const getVideoUrl = (video: Video): string => {
    if (!video.videoUrl) return '#';
    console.log('Video URL:', video.videoUrl);
    return video.videoUrl;
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLAnchorElement>, videoUrl: string) => {
    console.log('Clicked video, URL:', videoUrl);
    if (!videoUrl || videoUrl === '#') {
      e.preventDefault();
      toast.error('Link do vídeo não disponível');
      return;
    }
    // Let the native <a> tag handle the navigation
  };

  const handleAddByLinkSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`${platform}-videos`, accountId] });
    queryClient.invalidateQueries({ queryKey: [`${platform}-accounts`] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{platformLabels[platform]} de @{accountName}</DialogTitle>
                <DialogDescription>
                  {videos.length} {platformLabels[platform].toLowerCase()} encontrados. Clique para abrir no {platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : 'TikTok'}.
                </DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAddByLinkOpen(true)}
                className="shrink-0"
                disabled={syncingAll}
              >
                <Link className="h-4 w-4 mr-2" />
                Adicionar por link
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSyncAllVideos}
                className="shrink-0"
                disabled={syncingAll || sortedVideos.length === 0}
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {syncProgress.current}/{syncProgress.total}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Todos
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
            <div className="space-y-2">
              {sortedVideos.map((video) => (
                <a
                  key={video.id}
                  href={getVideoUrl(video)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleVideoClick(e, video.videoUrl)}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all group"
                >
                  {/* Title/Caption */}
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                      {video.title || video.caption || 'Sem título'}
                    </p>
                    {video.postedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(video.postedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-medium">{formatNumber(video.viewsCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      <span>{formatNumber(video.likesCount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{formatNumber(video.commentsCount)}</span>
                    </div>
                    {video.sharesCount !== undefined && video.sharesCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3.5 w-3.5" />
                        <span>{formatNumber(video.sharesCount)}</span>
                      </div>
                    )}
                    
                    {/* Sync button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => handleSyncVideo(video, e)}
                      disabled={syncingVideoId === video.id}
                      title="Atualizar métricas"
                    >
                      {syncingVideoId === video.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <ExternalLink className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
        </DialogContent>
      </Dialog>

      <AddVideoByLinkModal
        open={addByLinkOpen}
        onOpenChange={setAddByLinkOpen}
        platform={platform}
        accountId={accountId}
        onSuccess={handleAddByLinkSuccess}
      />
    </>
  );
}
