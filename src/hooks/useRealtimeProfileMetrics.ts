import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileMetric {
  id: string;
  profile_id: string;
  platform: string;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  followers: number;
  following: number;
  total_views: number;
  total_likes: number;
  total_posts: number;
  total_comments: number;
  total_shares: number;
  engagement_rate: number;
  last_synced_at: string;
  updated_at: string;
}

export interface AggregatedMetrics {
  totalFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  totalComments: number;
  totalAccounts: number;
  byPlatform: {
    instagram: { followers: number; views: number; likes: number; posts: number; accounts: number };
    tiktok: { followers: number; views: number; likes: number; posts: number; accounts: number };
    youtube: { followers: number; views: number; likes: number; posts: number; accounts: number };
  };
}

/**
 * Hook that provides realtime profile metrics with automatic UI updates
 * Subscribes to Supabase Realtime for the profile_metrics table
 */
export function useRealtimeProfileMetrics() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<ProfileMetric[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedMetrics>({
    totalFollowers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalPosts: 0,
    totalComments: 0,
    totalAccounts: 0,
    byPlatform: {
      instagram: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
      tiktok: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
      youtube: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculate aggregated metrics from raw data
  const calculateAggregated = useCallback((data: ProfileMetric[]): AggregatedMetrics => {
    const byPlatform = {
      instagram: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
      tiktok: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
      youtube: { followers: 0, views: 0, likes: 0, posts: 0, accounts: 0 },
    };

    let totalFollowers = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalPosts = 0;
    let totalComments = 0;

    for (const metric of data) {
      const platform = metric.platform as keyof typeof byPlatform;
      if (byPlatform[platform]) {
        byPlatform[platform].followers += metric.followers || 0;
        byPlatform[platform].views += metric.total_views || 0;
        byPlatform[platform].likes += metric.total_likes || 0;
        byPlatform[platform].posts += metric.total_posts || 0;
        byPlatform[platform].accounts += 1;
      }

      totalFollowers += metric.followers || 0;
      totalViews += metric.total_views || 0;
      totalLikes += metric.total_likes || 0;
      totalPosts += metric.total_posts || 0;
      totalComments += metric.total_comments || 0;
    }

    return {
      totalFollowers,
      totalViews,
      totalLikes,
      totalPosts,
      totalComments,
      totalAccounts: data.length,
      byPlatform,
    };
  }, []);

  // Fetch initial data
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_metrics')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[Realtime] Error fetching profile_metrics:', error);
        return;
      }

      const typedData = (data || []) as ProfileMetric[];
      setMetrics(typedData);
      setAggregated(calculateAggregated(typedData));
      setLastUpdate(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [calculateAggregated]);

  // Set up realtime subscription
  useEffect(() => {
    console.log('[Realtime] Setting up profile_metrics subscription...');

    // Initial fetch
    fetchMetrics();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('profile-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_metrics',
        },
        (payload) => {
          console.log('[Realtime] profile_metrics change:', payload.eventType, payload.new);

          // Update local state based on event type
          setMetrics((prev) => {
            let updated: ProfileMetric[];

            if (payload.eventType === 'INSERT') {
              updated = [payload.new as ProfileMetric, ...prev];
            } else if (payload.eventType === 'UPDATE') {
              updated = prev.map((m) =>
                m.id === (payload.new as ProfileMetric).id ? (payload.new as ProfileMetric) : m
              );
            } else if (payload.eventType === 'DELETE') {
              updated = prev.filter((m) => m.id !== (payload.old as { id: string }).id);
            } else {
              updated = prev;
            }

            // Recalculate aggregated metrics
            setAggregated(calculateAggregated(updated));
            setLastUpdate(new Date());

            return updated;
          });

          // Also invalidate related queries for components using React Query
          queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
          queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] profile_metrics subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up profile_metrics subscription...');
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics, calculateAggregated, queryClient]);

  return {
    metrics,
    aggregated,
    isLoading,
    lastUpdate,
    refetch: fetchMetrics,
  };
}
