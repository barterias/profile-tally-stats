import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoDetailsResponse {
  platform: string;
  videoId: string;
  videoUrl: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  duration?: number;
  publishedAt?: string;
  author?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface FetchVideoDetailsParams {
  videoUrl?: string;
  platform?: string;
  videoId?: string;
  updateDatabase?: boolean;
  tableId?: string;
}

export function useVideoDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchVideoDetailsParams): Promise<VideoDetailsResponse> => {
      const { data, error } = await supabase.functions.invoke('video-details', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch video details');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch video details');
      }

      return data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on platform
      if (variables.platform === 'tiktok') {
        queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      } else if (variables.platform === 'instagram') {
        queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
      } else if (variables.platform === 'youtube') {
        queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });
      }
      toast.success('Métricas do vídeo atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar detalhes: ${error.message}`);
    },
  });
}

// Function to sync a single video's metrics
export async function syncVideoMetrics(
  videoUrl: string,
  tableId: string,
  platform: string
): Promise<VideoDetailsResponse | null> {
  const { data, error } = await supabase.functions.invoke('video-details', {
    body: {
      videoUrl,
      updateDatabase: true,
      tableId,
    },
  });

  if (error || !data?.success) {
    console.error('Error syncing video metrics:', error || data?.error);
    return null;
  }

  return data.data;
}
