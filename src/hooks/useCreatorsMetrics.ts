import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorMetric {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  followers_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_posts: number;
  engagement_rate: number;
  period_start: string | null;
  period_end: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

interface UseCreatorsMetricsParams {
  platform?: string;
  startDate?: Date;
  endDate?: Date;
}

export const useCreatorsMetrics = (params?: UseCreatorsMetricsParams) => {
  return useQuery({
    queryKey: ['creators-metrics', params?.platform, params?.startDate, params?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('creators_metrics')
        .select('*')
        .order('scraped_at', { ascending: false });

      if (params?.platform && params.platform !== 'all') {
        query = query.eq('platform', params.platform);
      }

      if (params?.startDate) {
        query = query.gte('scraped_at', params.startDate.toISOString());
      }

      if (params?.endDate) {
        query = query.lte('scraped_at', params.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching creators metrics:', error);
        throw error;
      }

      return (data || []) as CreatorMetric[];
    },
  });
};

export const useCreatorDetail = (creatorId: string | null) => {
  return useQuery({
    queryKey: ['creator-detail', creatorId],
    queryFn: async () => {
      if (!creatorId) return null;

      const { data, error } = await supabase
        .from('creators_metrics')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (error) {
        console.error('Error fetching creator detail:', error);
        throw error;
      }

      return data as CreatorMetric;
    },
    enabled: !!creatorId,
  });
};
