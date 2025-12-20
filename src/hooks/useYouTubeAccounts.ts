import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useYouTubeAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['youtube-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useAllYouTubeAccounts() {
  return useQuery({
    queryKey: ['youtube-accounts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAddYouTubeAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (username: string) => {
      // Check if account already exists (even if inactive)
      const { data: existing } = await supabase
        .from('youtube_accounts')
        .select('id, is_active')
        .eq('user_id', user?.id)
        .eq('username', username)
        .maybeSingle();
      
      if (existing) {
        // Reactivate if inactive
        if (!existing.is_active) {
          const { error: updateError } = await supabase
            .from('youtube_accounts')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
          
          // Sync the account
          const { error: syncError } = await supabase.functions.invoke('youtube-scrape', {
            body: { accountId: existing.id, username },
          });
          
          if (syncError) throw syncError;
          return { success: true, reactivated: true };
        }
        return { success: false, error: 'Conta já existe' };
      }
      
      // Insert new account
      const { data: newAccount, error: insertError } = await supabase
        .from('youtube_accounts')
        .insert({
          user_id: user?.id,
          username,
          profile_url: `https://youtube.com/@${username}`,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Sync the new account
      const { error: syncError } = await supabase.functions.invoke('youtube-scrape', {
        body: { accountId: newAccount.id, username },
      });
      
      if (syncError) {
        console.error('Sync error:', syncError);
      }
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.reactivated ? 'Canal reativado!' : 'Canal adicionado!');
        queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
      } else {
        toast.error(result.error || 'Erro ao adicionar canal');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar canal');
    },
  });
}

export function useSyncYouTubeAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data: account } = await supabase
        .from('youtube_accounts')
        .select('username')
        .eq('id', accountId)
        .single();
      
      if (!account) throw new Error('Canal não encontrado');
      
      const { error } = await supabase.functions.invoke('youtube-scrape', {
        body: { accountId, username: account.username },
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Canal sincronizado!');
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar canal');
    },
  });
}

export function useDeleteYouTubeAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      // Delete metrics history first
      await supabase
        .from('youtube_metrics_history')
        .delete()
        .eq('account_id', accountId);

      // Delete videos
      await supabase
        .from('youtube_videos')
        .delete()
        .eq('account_id', accountId);

      // Delete the account
      const { error } = await supabase
        .from('youtube_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Canal removido!');
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover canal');
    },
  });
}
