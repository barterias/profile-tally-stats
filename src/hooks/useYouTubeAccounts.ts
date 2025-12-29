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
        .or('is_active.is.null,is_active.eq.true')
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
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAddYouTubeAccount() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  return useMutation({
    mutationFn: async ({ username, isClientOrAdmin }: { username: string; isClientOrAdmin?: boolean }) => {
      const autoApprove = isClientOrAdmin || isAdmin;
      
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
            .update({ 
              is_active: true, 
              updated_at: new Date().toISOString(),
              ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
            })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
          
          // Sync the account
          const { error: syncError } = await supabase.functions.invoke('youtube-scrape-native', {
            body: { accountId: existing.id, username },
          });
          
          if (syncError) throw syncError;
          return { success: true, reactivated: true };
        }
        return { success: false, error: 'Conta já existe' };
      }
      
      // Insert new account - auto-approve for clients/admins
      const { data: newAccount, error: insertError } = await supabase
        .from('youtube_accounts')
        .insert({
          user_id: user?.id,
          username,
          profile_url: `https://youtube.com/@${username}`,
          is_active: true,
          ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Sync the new account
      const { error: syncError } = await supabase.functions.invoke('youtube-scrape-native', {
        body: { accountId: newAccount.id, username },
      });
      
      if (syncError) {
        console.error('Sync error:', syncError);
      }
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.reactivated ? 'Canal reativado! Sincronizando em segundo plano...' : 'Canal adicionado! Sincronizando em segundo plano...');
        queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
        // Refresh after a delay to get updated data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
        }, 5000);
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
      
      const { error } = await supabase.functions.invoke('youtube-scrape-native', {
        body: { accountId, username: account.username },
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Sincronização iniciada em segundo plano!');
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
      // Refresh after delay to get updated data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      }, 5000);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar canal');
    },
  });
}

export function useSyncAllYouTubeAccounts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accounts: { id: string; username: string }[]) => {
      console.log(`[YouTube Sync All] Starting sync for ${accounts.length} accounts`);
      
      const results = await Promise.allSettled(
        accounts.map(async (acc) => {
          console.log(`[YouTube Sync All] Syncing: ${acc.username}`);
          const { data, error } = await supabase.functions.invoke('youtube-scrape-native', {
            body: { accountId: acc.id, username: acc.username },
          });
          
          if (error) {
            console.error(`[YouTube Sync All] Error syncing ${acc.username}:`, error);
            throw error;
          }
          
          console.log(`[YouTube Sync All] Success: ${acc.username}`);
          return { success: true, username: acc.username };
        })
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = accounts.length - successCount;
      
      console.log(`[YouTube Sync All] Complete: ${successCount} success, ${failCount} failed`);
      
      return { successCount, failCount, total: accounts.length };
    },
    onSuccess: (result) => {
      if (result.failCount === 0) {
        toast.success(`${result.successCount} canais sincronizados com sucesso!`);
      } else {
        toast.warning(`${result.successCount}/${result.total} canais sincronizados. ${result.failCount} falharam.`);
      }
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar canais');
    },
  });
}

export function useDeleteYouTubeAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      // Use the security definer function to delete account and all related data
      const { error } = await supabase.rpc('delete_social_account', {
        p_account_id: accountId,
        p_platform: 'youtube'
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Canal removido!');
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover canal');
    },
  });
}
