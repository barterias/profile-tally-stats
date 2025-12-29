import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InstagramVideo {
  id: string;
  account_id: string;
  post_url: string;
  post_type: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  shares_count: number | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInstagramVideos(accountId: string) {
  return useQuery({
    queryKey: ['instagram-videos', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false });

      if (error) {
        console.error('Error fetching Instagram posts:', error);
        return [];
      }

      return data as InstagramVideo[];
    },
    enabled: !!accountId,
  });
}

// Hook to fetch all posts for all accounts (for calculating totals)
export function useAllInstagramVideos() {
  return useQuery({
    queryKey: ['instagram-videos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('account_id, views_count, likes_count, comments_count');

      if (error) {
        console.error('Error fetching all Instagram posts:', error);
        return [];
      }

      return data;
    },
  });
}
