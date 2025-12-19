import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTikTokAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tiktok-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_accounts')
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

export function useAllTikTokAccounts() {
  return useQuery({
    queryKey: ['tiktok-accounts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAddTikTokAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (username: string) => {
      // Check if account already exists (even if inactive)
      const { data: existing } = await supabase
        .from('tiktok_accounts')
        .select('id, is_active')
        .eq('user_id', user?.id)
        .eq('username', username)
        .maybeSingle();
      
      if (existing) {
        // Reactivate if inactive
        if (!existing.is_active) {
          const { error: updateError } = await supabase
            .from('tiktok_accounts')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
          
          // Sync the account
          const { error: syncError } = await supabase.functions.invoke('tiktok-scrape', {
            body: { accountId: existing.id, username },
          });
          
          if (syncError) throw syncError;
          return { success: true, reactivated: true };
        }
        return { success: false, error: 'Conta já existe' };
      }
      
      // Insert new account
      const { data: newAccount, error: insertError } = await supabase
        .from('tiktok_accounts')
        .insert({
          user_id: user?.id,
          username,
          profile_url: `https://tiktok.com/@${username}`,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Sync the new account
      const { error: syncError } = await supabase.functions.invoke('tiktok-scrape', {
        body: { accountId: newAccount.id, username },
      });
      
      if (syncError) {
        console.error('Sync error:', syncError);
      }
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.reactivated ? 'Conta reativada!' : 'Conta adicionada!');
        queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      } else {
        toast.error(result.error || 'Erro ao adicionar conta');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar conta');
    },
  });
}

export function useSyncTikTokAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('username')
        .eq('id', accountId)
        .single();
      
      if (!account) throw new Error('Conta não encontrada');
      
      const { error } = await supabase.functions.invoke('tiktok-scrape', {
        body: { accountId, username: account.username },
      });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Conta sincronizada!');
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar conta');
    },
  });
}

export function useDeleteTikTokAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('tiktok_accounts')
        .update({ is_active: false })
        .eq('id', accountId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Conta removida!');
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover conta');
    },
  });
}
