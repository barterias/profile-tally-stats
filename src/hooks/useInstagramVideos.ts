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
      // Fetch top 10 posts by views for display
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('account_id', accountId)
        .order('views_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching Instagram posts:', error);
        return [];
      }

      return data as InstagramVideo[];
    },
    enabled: !!accountId,
  });
}

// Hook to fetch totals for a specific account
export function useInstagramVideosTotals(accountId: string) {
  return useQuery({
    queryKey: ['instagram-videos-totals', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('views_count, likes_count, comments_count')
        .eq('account_id', accountId);

      if (error) {
        console.error('Error fetching Instagram post totals:', error);
        return { count: 0, totalViews: 0 };
      }

      const totalViews = (data || []).reduce((sum, v) => sum + Number(v.views_count || 0), 0);
      return { count: data?.length || 0, totalViews };
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
