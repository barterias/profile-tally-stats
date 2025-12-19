import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TikTokVideo {
  id: string;
  account_id: string;
  video_id: string | null;
  video_url: string;
  caption: string | null;
  thumbnail_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  music_title: string | null;
  duration: number | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTikTokVideos(accountId: string) {
  return useQuery({
    queryKey: ['tiktok-videos', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_videos')
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false });

      if (error) {
        console.error('Error fetching TikTok videos:', error);
        return [];
      }

      return data as TikTokVideo[];
    },
    enabled: !!accountId,
  });
}
