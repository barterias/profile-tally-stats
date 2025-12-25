import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Platform = 'instagram' | 'youtube' | 'tiktok';

/**
 * Hook that subscribes to realtime updates for social media accounts
 * and automatically invalidates the relevant queries when data changes
 */
export function useRealtimeAccounts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Setting up realtime subscriptions for social accounts...');

    const channel = supabase
      .channel('social-accounts-changes')
      // Instagram accounts updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_accounts'
        },
        (payload) => {
          console.log('[Realtime] Instagram accounts change detected:', payload.eventType);
          invalidateInstagramQueries();
        }
      )
      // YouTube accounts updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'youtube_accounts'
        },
        (payload) => {
          console.log('[Realtime] YouTube accounts change detected:', payload.eventType);
          invalidateYouTubeQueries();
        }
      )
      // TikTok accounts updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tiktok_accounts'
        },
        (payload) => {
          console.log('[Realtime] TikTok accounts change detected:', payload.eventType);
          invalidateTikTokQueries();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    function invalidateInstagramQueries() {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    }

    function invalidateYouTubeQueries() {
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    }

    function invalidateTikTokQueries() {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    }

    return () => {
      console.log('[Realtime] Cleaning up realtime subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
