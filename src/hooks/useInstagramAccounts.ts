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
  const { user } = useAuth();

  return useMutation({
    mutationFn: (username: string) => instagramApi.addAccount(username, user?.id || ''),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Conta do Instagram adicionada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
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
    mutationFn: (accountId: string) => instagramApi.syncAccount(accountId),
    onSuccess: (result, accountId) => {
      if (result.success) {
        toast.success('Métricas atualizadas com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-posts', accountId] });
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

export function useDeleteInstagramAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => instagramApi.deleteAccount(accountId),
    onSuccess: (result, accountId) => {
      if (result.success) {
        toast.success('Conta removida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-accounts-all'] });
        queryClient.invalidateQueries({ queryKey: ['instagram-posts', accountId] });
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
