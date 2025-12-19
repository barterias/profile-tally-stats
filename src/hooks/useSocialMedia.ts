import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, metricsApi, syncApi, settingsApi, mockData } from '@/services/socialMediaApi';
import type { SocialPlatform, DashboardSettings } from '@/types/socialMedia';
import { toast } from 'sonner';

// Use mock data for development - set to false when connecting to real API
const USE_MOCK_DATA = true;

export function useSocialAccounts() {
  return useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockData.accounts;
      }
      return accountsApi.getAll();
    },
  });
}

export function useSocialAccount(accountId: string) {
  return useQuery({
    queryKey: ['social-account', accountId],
    queryFn: () => accountsApi.getById(accountId),
    enabled: !USE_MOCK_DATA && !!accountId,
  });
}

export function useMetricsSummary() {
  return useQuery({
    queryKey: ['metrics-summary'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockData.summary;
      }
      return metricsApi.getSummary();
    },
  });
}

export function useMetricsHistory(days: number = 30) {
  return useQuery({
    queryKey: ['metrics-history', days],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return mockData.chartData;
      }
      return metricsApi.getHistory(days);
    },
  });
}

export function useConnectAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (platform: SocialPlatform) => 
      accountsApi.connect({ 
        platform, 
        redirect_uri: `${window.location.origin}/social/oauth/callback` 
      }),
    onSuccess: (data) => {
      // Redirect to OAuth URL
      window.location.href = data.oauth_url;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar: ${error.message}`);
    },
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: accountsApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      toast.success('Conta desconectada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: syncApi.triggerSync,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-history'] });
      toast.success(`Sincronização completa: ${data.synced_accounts} contas atualizadas`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: syncApi.getSyncStatus,
    enabled: !USE_MOCK_DATA,
    refetchInterval: 30000, // Check every 30 seconds
  });
}

export function useDashboardSettings() {
  return useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return {
          sync_frequency_hours: 6,
          notifications_enabled: true,
          email_alerts: false,
          timezone: 'America/Sao_Paulo',
        } as DashboardSettings;
      }
      return settingsApi.get();
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-settings'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });
}
