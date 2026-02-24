import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type FunctionInvokeFailure = {
  success: false;
  status?: number;
  error: string;
};

function parseInvokeError(err: any): { status?: number; message: string } {
  const raw = String(err?.message || err?.error_description || err?.error || 'Erro desconhecido');
  const m = raw.match(/returned\s+(\d{3})/i);
  const status = m ? Number(m[1]) : (typeof err?.status === 'number' ? err.status : undefined);

  if (status === 402) {
    return { status, message: 'Limite do Apify atingido. Finalize runs em andamento no Apify ou faça upgrade do plano.' };
  }
  if (status === 429) {
    return { status, message: 'Muitas requisições. Aguarde um pouco e tente novamente.' };
  }

  return { status, message: raw };
}

export function useKwaiAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['kwai-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kwai_accounts' as any)
        .select('*')
        .eq('user_id', user?.id)
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });
}

export function useAllKwaiAccounts() {
  return useQuery({
    queryKey: ['kwai-accounts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kwai_accounts' as any)
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAddKwaiAccount() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async ({ username: kwaiUserId, isClientOrAdmin }: { username: string; isClientOrAdmin?: boolean }) => {
      const autoApprove = isClientOrAdmin || isAdmin;

      // Check if account with this kwai user ID already exists
      const { data: existing } = await supabase
        .from('kwai_accounts' as any)
        .select('id, is_active')
        .eq('user_id', user?.id)
        .eq('username', kwaiUserId)
        .maybeSingle();

      if (existing) {
        if (!(existing as any).is_active) {
          const { error: updateError } = await supabase
            .from('kwai_accounts' as any)
            .update({
              is_active: true,
              updated_at: new Date().toISOString(),
              ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
            })
            .eq('id', (existing as any).id);

          if (updateError) throw updateError;

          const { data: syncData, error: syncError } = await supabase.functions.invoke('kwai-scrape', {
            body: { accountId: (existing as any).id, username: kwaiUserId },
          });

          if (syncError) {
            const parsed = parseInvokeError(syncError);
            return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
          }

          if (syncData && (syncData as any).success === false) {
            return { success: false, error: (syncData as any).error || 'Erro ao scrape do Kwai.', status: 402 } satisfies FunctionInvokeFailure;
          }

          return { success: true, reactivated: true };
        }
        return { success: false, error: 'Conta já existe' } satisfies FunctionInvokeFailure;
      }

      const { data: newAccount, error: insertError } = await supabase
        .from('kwai_accounts' as any)
        .insert({
          user_id: user?.id,
          username: kwaiUserId,
          profile_url: `https://www.kwai.com/@${kwaiUserId}`,
          is_active: true,
          ...(autoApprove ? { approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id } : {}),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: syncData, error: syncError } = await supabase.functions.invoke('kwai-scrape', {
        body: { accountId: (newAccount as any).id, username: kwaiUserId },
      });

      if (syncError) {
        const parsed = parseInvokeError(syncError);
        return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
      }

      if (syncData && (syncData as any).success === false) {
        return { success: false, error: (syncData as any).error || 'Erro ao scrape do Kwai.', status: 402 } satisfies FunctionInvokeFailure;
      }

      return { success: true };
    },
    onSuccess: (result: any) => {
      if (result?.success) {
        toast.success(result.reactivated ? 'Conta reativada!' : 'Conta Kwai adicionada!');
        queryClient.invalidateQueries({ queryKey: ['kwai-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-videos'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-videos-all'] });
      } else {
        toast.error(result?.error || 'Erro ao adicionar conta Kwai');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar conta Kwai');
    },
  });
}

export function useSyncKwaiAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const { data: account } = await supabase
        .from('kwai_accounts' as any)
        .select('username')
        .eq('id', accountId)
        .single();

      if (!account) throw new Error('Conta não encontrada');

      const { data: result, error } = await supabase.functions.invoke('kwai-scrape', {
        body: { accountId, username: (account as any).username },
      });

      if (error) {
        const parsed = parseInvokeError(error);
        return { success: false, error: parsed.message, status: parsed.status } satisfies FunctionInvokeFailure;
      }

      if (result && (result as any).success === false) {
        return { success: false, error: (result as any).error || 'Erro ao scrape do Kwai.', status: 402 } satisfies FunctionInvokeFailure;
      }

      return { success: true, videosCount: (result as any)?.data?.scrapedVideosCount || 0 };
    },
    onSuccess: (result: any) => {
      if (result?.success) {
        toast.success(`Conta Kwai sincronizada! ${result.videosCount} vídeos coletados.`);
        queryClient.invalidateQueries({ queryKey: ['kwai-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-videos'] });
        queryClient.invalidateQueries({ queryKey: ['kwai-videos-all'] });
      } else {
        toast.error(result?.error || 'Erro ao sincronizar conta Kwai');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar conta Kwai');
    },
  });
}

export function useSyncAllKwaiAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accounts: { id: string; username: string }[]) => {
      const results = await Promise.allSettled(
        accounts.map(async (acc) => {
          const { data, error } = await supabase.functions.invoke('kwai-scrape', {
            body: { accountId: acc.id, username: acc.username },
          });

          if (error) {
            const parsed = parseInvokeError(error);
            return { success: false, error: parsed.message } as FunctionInvokeFailure;
          }

          if (data && (data as any).success === false) {
            return { success: false, error: (data as any).error || 'Erro.' } as FunctionInvokeFailure;
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
        toast.success(`${result.successCount} contas Kwai sincronizadas com sucesso!`);
      } else {
        toast.warning(`${result.successCount}/${result.total} contas sincronizadas. ${result.failCount} falharam.`);
      }
      queryClient.invalidateQueries({ queryKey: ['kwai-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-videos'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-videos-all'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar contas Kwai');
    },
  });
}

export function useDeleteKwaiAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.rpc('delete_social_account', {
        p_account_id: accountId,
        p_platform: 'kwai',
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Conta Kwai removida!');
      queryClient.invalidateQueries({ queryKey: ['kwai-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-videos'] });
      queryClient.invalidateQueries({ queryKey: ['kwai-videos-all'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover conta Kwai');
    },
  });
}
