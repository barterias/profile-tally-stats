import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeVideo {
  id: string;
  account_id: string;
  video_id: string;
  video_url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  duration: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useYouTubeVideos(accountId: string) {
  return useQuery({
    queryKey: ['youtube-videos', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false });

      if (error) {
        console.error('Error fetching YouTube videos:', error);
        return [];
      }

      return data as YouTubeVideo[];
    },
    enabled: !!accountId,
  });
}

export function useAllYouTubeVideos(accountIds: string[]) {
  return useQuery({
    queryKey: ['youtube-videos-all', accountIds],
    queryFn: async () => {
      if (accountIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, account_id, views_count, likes_count, comments_count')
        .in('account_id', accountIds);

      if (error) {
        console.error('Error fetching all YouTube videos:', error);
        return [];
      }

      return data as Pick<YouTubeVideo, 'id' | 'account_id' | 'views_count' | 'likes_count' | 'comments_count'>[];
    },
    enabled: accountIds.length > 0,
  });
}
