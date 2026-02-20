import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KwaiVideo {
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

export function useKwaiVideos(accountId: string) {
  return useQuery({
    queryKey: ['kwai-videos', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kwai_videos' as any)
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching Kwai videos:', error);
        return [];
      }

      return (data as unknown) as KwaiVideo[];
    },
    enabled: !!accountId,
  });
}

export function useAllKwaiVideos() {
  return useQuery({
    queryKey: ['kwai-videos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kwai_videos' as any)
        .select('account_id, views_count');

      if (error) {
        console.error('Error fetching all Kwai videos:', error);
        return [];
      }

      return (data as unknown) as { account_id: string; views_count: number | null }[];
    },
  });
}
