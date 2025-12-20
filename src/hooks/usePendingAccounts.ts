import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingSocialAccount {
  platform: string;
  id: string;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  followers_count: number | null;
  content_count: number | null;
  user_id: string;
  approval_status: string;
  created_at: string;
  owner_username: string | null;
}

export function usePendingAccounts() {
  return useQuery({
    queryKey: ['pending-social-accounts'],
    queryFn: async () => {
      // Fetch pending accounts from all platforms
      const [instagram, tiktok, youtube] = await Promise.all([
        supabase
          .from('instagram_accounts')
          .select('*, profiles!instagram_accounts_user_id_fkey(username)')
          .eq('approval_status', 'pending'),
        supabase
          .from('tiktok_accounts')
          .select('*, profiles!tiktok_accounts_user_id_fkey(username)')
          .eq('approval_status', 'pending'),
        supabase
          .from('youtube_accounts')
          .select('*, profiles!youtube_accounts_user_id_fkey(username)')
          .eq('approval_status', 'pending'),
      ]);

      const accounts: PendingSocialAccount[] = [];

      if (instagram.data) {
        instagram.data.forEach((acc: any) => {
          accounts.push({
            platform: 'instagram',
            id: acc.id,
            username: acc.username,
            display_name: acc.display_name,
            profile_image_url: acc.profile_image_url,
            followers_count: acc.followers_count,
            content_count: acc.posts_count,
            user_id: acc.user_id,
            approval_status: acc.approval_status,
            created_at: acc.created_at,
            owner_username: acc.profiles?.username || null,
          });
        });
      }

      if (tiktok.data) {
        tiktok.data.forEach((acc: any) => {
          accounts.push({
            platform: 'tiktok',
            id: acc.id,
            username: acc.username,
            display_name: acc.display_name,
            profile_image_url: acc.profile_image_url,
            followers_count: acc.followers_count,
            content_count: acc.videos_count,
            user_id: acc.user_id,
            approval_status: acc.approval_status,
            created_at: acc.created_at,
            owner_username: acc.profiles?.username || null,
          });
        });
      }

      if (youtube.data) {
        youtube.data.forEach((acc: any) => {
          accounts.push({
            platform: 'youtube',
            id: acc.id,
            username: acc.username,
            display_name: acc.display_name,
            profile_image_url: acc.profile_image_url,
            followers_count: acc.subscribers_count,
            content_count: acc.videos_count,
            user_id: acc.user_id,
            approval_status: acc.approval_status,
            created_at: acc.created_at,
            owner_username: acc.profiles?.username || null,
          });
        });
      }

      return accounts;
    },
  });
}

export function useApproveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, platform }: { accountId: string; platform: string }) => {
      const { error } = await supabase.rpc('approve_social_account', {
        p_account_id: accountId,
        p_platform: platform,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta aprovada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pending-social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aprovar conta');
    },
  });
}

export function useRejectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, platform }: { accountId: string; platform: string }) => {
      const { error } = await supabase.rpc('reject_social_account', {
        p_account_id: accountId,
        p_platform: platform,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta rejeitada');
      queryClient.invalidateQueries({ queryKey: ['pending-social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao rejeitar conta');
    },
  });
}
