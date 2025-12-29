import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type FunctionInvokeFailure = {
  success: false;
  status?: number;
  error: string;
};

type FunctionInvokeOk<T> = {
  success: true;
  data?: T;
};

function parseInvokeError(err: any): { status?: number; message: string } {
  const raw = String(err?.message || err?.error_description || err?.error || 'Erro desconhecido');
  const m = raw.match(/returned\s+(\d{3})/i);
  const status = m ? Number(m[1]) : (typeof err?.status === 'number' ? err.status : undefined);

  // Friendly messages
  if (status === 402) {
    return { status, message: 'Limite do Apify atingido. Finalize runs em andamento no Apify ou faça upgrade do plano.' };
  }
  if (status === 429) {
    return { status, message: 'Muitas requisições. Aguarde um pouco e tente novamente.' };
  }

  return { status, message: raw };
}

export function useTikTokAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tiktok-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_accounts')
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

export function useAllTikTokAccounts() {
  return useQuery({
    queryKey: ['tiktok-accounts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAddTikTokAccount() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  return useMutation({
    mutationFn: async ({ username, isClientOrAdmin }: { username: string; isClientOrAdmin?: boolean }) => {
      const autoApprove = isClientOrAdmin || isAdmin;

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
            .update({
              is_active: true,
              updated_at: new Date().toISOString(),
              ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;

          const { data: syncData, error: syncError } = await supabase.functions.invoke('tiktok-scrape-apify', {
            body: { accountId: existing.id, username, resultsLimit: 300 },
          });

          if (syncError) {
            const parsed = parseInvokeError(syncError);
            return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
          }

          if (syncData && (syncData as any).success === false) {
            return {
              success: false,
              error: (syncData as any).error || 'Limite do Apify atingido.',
              status: 402,
            } satisfies FunctionInvokeFailure;
          }

          return { success: true, reactivated: true };
        }
        return { success: false, error: 'Conta já existe' } satisfies FunctionInvokeFailure;
      }

      // Insert new account - auto-approve for clients/admins
      const { data: newAccount, error: insertError } = await supabase
        .from('tiktok_accounts')
        .insert({
          user_id: user?.id,
          username,
          profile_url: `https://tiktok.com/@${username}`,
          is_active: true,
          ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: syncData, error: syncError } = await supabase.functions.invoke('tiktok-scrape-apify', {
        body: { accountId: newAccount.id, username, resultsLimit: 300 },
      });

      if (syncError) {
        const parsed = parseInvokeError(syncError);
        return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
      }

      if (syncData && (syncData as any).success === false) {
        return {
          success: false,
          error: (syncData as any).error || 'Limite do Apify atingido.',
          status: 402,
        } satisfies FunctionInvokeFailure;
      }

      return { success: true };
    },
    onSuccess: (result: any) => {
      if (result?.success) {
        toast.success(result.reactivated ? 'Conta reativada!' : 'Conta adicionada!');
        queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      } else {
        toast.error(result?.error || 'Erro ao adicionar conta');
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
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('username')
        .eq('id', accountId)
        .single();

      if (!account) throw new Error('Conta não encontrada');

      const { data: result, error } = await supabase.functions.invoke('tiktok-scrape-apify', {
        body: { accountId, username: account.username, resultsLimit: 300 },
      });

      if (error) {
        const parsed = parseInvokeError(error);
        return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
      }

      if (result && (result as any).success === false) {
        return {
          success: false,
          error: (result as any).error || 'Limite do Apify atingido.',
          status: 402,
        } satisfies FunctionInvokeFailure;
      }

      return { success: true, videosCount: (result as any)?.data?.scrapedVideosCount || 0 };
    },
    onSuccess: (result: any) => {
      if (result?.success) {
        toast.success(`Conta sincronizada! ${result.videosCount} vídeos coletados.`);
        queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
        queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      } else {
        toast.error(result?.error || 'Erro ao sincronizar conta');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar conta');
    },
  });
}

export function useSyncAllTikTokAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accounts: { id: string; username: string }[]) => {
      const results = await Promise.allSettled(
        accounts.map(async (acc) => {
          const { data, error } = await supabase.functions.invoke('tiktok-scrape-apify', {
            body: { accountId: acc.id, username: acc.username, resultsLimit: 300 },
          });

          if (error) {
            const parsed = parseInvokeError(error);
            return { success: false, error: parsed.message, status: parsed.status } as FunctionInvokeFailure;
          }

          if (data && (data as any).success === false) {
            return {
              success: false,
              error: (data as any).error || 'Limite do Apify atingido.',
              status: 402,
            } as FunctionInvokeFailure;
          }

          return { success: true } as const;
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.success === true).length;
      const failCount = accounts.length - successCount;

      return { successCount, failCount, total: accounts.length };
    },
    onSuccess: (result) => {
      if (result.failCount === 0) {
        toast.success(`${result.successCount} contas sincronizadas com sucesso!`);
      } else {
        toast.warning(`${result.successCount}/${result.total} contas sincronizadas. ${result.failCount} falharam.`);
      }
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar contas');
    },
  });
}

export function useDeleteTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      // Use the security definer function to delete account and all related data
      const { error } = await supabase.rpc('delete_social_account', {
        p_account_id: accountId,
        p_platform: 'tiktok'
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Conta removida!');
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-videos-all'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover conta');
    },
  });
}
