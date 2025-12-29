import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  platform: string;
  username: string;
  success: boolean;
  error?: string;
}

/**
 * Hook to sync all social media profiles using ScrapeCreators API
 * Updates the profile_metrics table which triggers realtime updates
 */
export function useSyncAllProfiles() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();

  const syncAll = async () => {
    setIsSyncing(true);
    setProgress(0);
    setResults([]);

    try {
      // Fetch only Instagram accounts
      const instagramResult = await supabase
        .from('instagram_accounts')
        .select('id, username')
        .eq('is_active', true);

      const allAccounts = (instagramResult.data || []).map((a) => ({ ...a, platform: 'instagram' }));

      if (allAccounts.length === 0) {
        toast({
          title: 'Nenhuma conta encontrada',
          description: 'Adicione contas nas plataformas para sincronizar.',
          variant: 'destructive',
        });
        setIsSyncing(false);
        return;
      }

      const syncResults: SyncResult[] = [];
      let completed = 0;

      // Sync each account sequentially to avoid rate limits
      for (const account of allAccounts) {
        try {
          let functionName = '';
          let payload: Record<string, any> = { accountId: account.id, fetchVideos: true };

          // Only Instagram is supported
          functionName = 'instagram-scrape-native';
          payload.username = account.username;

          console.log(`[Sync] Syncing ${account.platform}/${account.username}...`);

          const { error } = await supabase.functions.invoke(functionName, {
            body: payload,
          });

          if (error) {
            throw error;
          }

          syncResults.push({
            platform: account.platform,
            username: account.username,
            success: true,
          });

          console.log(`[Sync] ✓ ${account.platform}/${account.username} synced`);
        } catch (error) {
          console.error(`[Sync] ✗ ${account.platform}/${account.username} failed:`, error);
          syncResults.push({
            platform: account.platform,
            username: account.username,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        completed++;
        setProgress(Math.round((completed / allAccounts.length) * 100));
        setResults([...syncResults]);

        // Small delay between requests to avoid rate limiting
        if (completed < allAccounts.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const successCount = syncResults.filter((r) => r.success).length;
      const failCount = syncResults.filter((r) => !r.success).length;

      toast({
        title: 'Sincronização concluída',
        description: `${successCount} contas sincronizadas${failCount > 0 ? `, ${failCount} falharam` : ''}`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('[Sync] Error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setProgress(100);
    }
  };

  return {
    syncAll,
    isSyncing,
    progress,
    results,
  };
}
