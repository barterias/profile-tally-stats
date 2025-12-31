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
      // Fetch top 10 videos by views for display
      const { data, error } = await supabase
        .from('tiktok_videos')
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching TikTok videos:', error);
        return [];
      }

      return data as TikTokVideo[];
    },
    enabled: !!accountId,
  });
}

// Hook to fetch all videos for a specific account (for total count)
export function useTikTokVideosTotals(accountId: string) {
  return useQuery({
    queryKey: ['tiktok-videos-totals', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_videos')
        .select('views_count, likes_count, comments_count')
        .eq('account_id', accountId);

      if (error) {
        console.error('Error fetching TikTok video totals:', error);
        return { count: 0, totalViews: 0 };
      }

      const totalViews = (data || []).reduce((sum, v) => sum + Number(v.views_count || 0), 0);
      return { count: data?.length || 0, totalViews };
    },
    enabled: !!accountId,
  });
}

// Hook to fetch all videos for all accounts (for calculating total views)
export function useAllTikTokVideos() {
  return useQuery({
    queryKey: ['tiktok-videos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_videos')
        .select('account_id, views_count');

      if (error) {
        console.error('Error fetching all TikTok videos:', error);
        return [];
      }

      return data;
    },
  });
}
