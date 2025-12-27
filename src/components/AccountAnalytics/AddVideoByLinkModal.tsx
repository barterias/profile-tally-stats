import { useState } from 'react';
import { Link, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useVideoDetails } from '@/hooks/useVideoDetails';

interface AddVideoByLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: 'tiktok' | 'instagram' | 'youtube';
  accountId?: string;
  onSuccess?: () => void;
}

export function AddVideoByLinkModal({ 
  open, 
  onOpenChange, 
  platform, 
  accountId,
  onSuccess 
}: AddVideoByLinkModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    views?: number;
    likes?: number;
    comments?: number;
  } | null>(null);

  const videoDetails = useVideoDetails();

  const detectPlatform = (url: string): string | null => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim()) {
      toast.error('Cole o link do vídeo');
      return;
    }

    const detectedPlatform = detectPlatform(videoUrl);
    
    if (!detectedPlatform) {
      toast.error('Link inválido. Use links do TikTok, Instagram ou YouTube.');
      return;
    }

    if (detectedPlatform !== platform) {
      toast.error(`Este modal é para ${platform}. O link parece ser de ${detectedPlatform}.`);
      return;
    }

    setResult(null);

    try {
      const data = await videoDetails.mutateAsync({
        videoUrl: videoUrl.trim(),
        platform,
        updateDatabase: true,
        tableId: accountId,
      });

      setResult({
        success: true,
        views: data.viewsCount,
        likes: data.likesCount,
        comments: data.commentsCount,
      });

      toast.success('Métricas atualizadas com sucesso!');
      onSuccess?.();
    } catch (error) {
      setResult({ success: false });
      // Error toast is handled by useVideoDetails hook
    }
  };

  const handleClose = () => {
    setVideoUrl('');
    setResult(null);
    onOpenChange(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPlatformPlaceholder = () => {
    switch (platform) {
      case 'tiktok':
        return 'https://www.tiktok.com/@usuario/video/123...';
      case 'instagram':
        return 'https://www.instagram.com/reel/ABC123...';
      case 'youtube':
        return 'https://www.youtube.com/watch?v=...';
      default:
        return 'Cole o link do vídeo aqui';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Sincronizar Vídeo por Link
          </DialogTitle>
          <DialogDescription>
            Cole o link de um vídeo para buscar e atualizar suas métricas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">Link do Vídeo</Label>
            <Input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={getPlatformPlaceholder()}
              disabled={videoDetails.isPending}
            />
          </div>

          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Métricas atualizadas!</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Views</p>
                      <p className="font-semibold">{formatNumber(result.views || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Likes</p>
                      <p className="font-semibold">{formatNumber(result.likes || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Comentários</p>
                      <p className="font-semibold">{formatNumber(result.comments || 0)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Erro ao buscar métricas</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button type="submit" disabled={videoDetails.isPending || !videoUrl.trim()}>
              {videoDetails.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                'Buscar Métricas'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
