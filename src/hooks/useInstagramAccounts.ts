import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instagramApi, InstagramAccount, InstagramPost } from '@/lib/api/instagram';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useInstagramAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instagram-accounts', user?.id],
    queryFn: () => instagramApi.getAccounts(user?.id || ''),
    enabled: !!user?.id,
  });
}

export function useAllInstagramAccounts() {
  return useQuery({
    queryKey: ['instagram-accounts-all'],
    queryFn: () => instagramApi.getAllAccounts(),
  });
}

export function useInstagramPosts(accountId: string) {
  return useQuery({
    queryKey: ['instagram-posts', accountId],
    queryFn: () => instagramApi.getPosts(accountId),
    enabled: !!accountId,
  });
}

export function useInstagramMetricsSummary(userId?: string) {
  return useQuery({
    queryKey: ['instagram-metrics-summary', userId],
    queryFn: () => instagramApi.getMetricsSummary(userId),
  });
}

export function useAddInstagramAccount() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: ({ username, isClientOrAdmin }: { username: string; isClientOrAdmin?: boolean }) => 
      instagramApi.addAccount(username, user?.id || '', isClientOrAdmin || isAdmin),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Conta do Instagram adicionada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      } else {
        toast.error(result.error || 'Erro ao adicionar conta');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar conta');
    },
  });
}

export function useSyncInstagramAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, continueFrom = false }: { accountId: string; continueFrom?: boolean }) => 
      instagramApi.syncAccount(accountId, continueFrom),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.continueFrom ? 'Mais posts coletados!' : 'Métricas atualizadas com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      } else {
        toast.error(result.error || 'Erro ao sincronizar');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao sincronizar');
    },
  });
}

export function useSyncAllInstagramAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      const results = await Promise.allSettled(
        accountIds.map(id => instagramApi.syncAccount(id))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failCount = accountIds.length - successCount;
      
      return { successCount, failCount, total: accountIds.length };
    },
    onSuccess: (result) => {
      if (result.failCount === 0) {
        toast.success(`${result.successCount} contas sincronizadas com sucesso!`);
      } else {
        toast.warning(`${result.successCount}/${result.total} contas sincronizadas. ${result.failCount} falharam.`);
      }
      // Invalidate all related queries after all syncs complete
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-videos-all'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao sincronizar contas');
    },
  });
}

export function useDeleteInstagramAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => instagramApi.deleteAccount(accountId),
    onSuccess: (result, accountId) => {
      if (result.success) {
        toast.success('Conta removida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-videos-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-metrics-summary'] });
        queryClient.invalidateQueries({ queryKey: ['social-metrics-unified'] });
      } else {
        toast.error(result.error || 'Erro ao remover conta');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover conta');
    },
  });
}
