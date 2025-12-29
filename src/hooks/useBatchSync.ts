import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PlatformResult {
  synced: number;
  errors: number;
  accounts: string[];
}

interface BatchSyncResults {
  instagram: PlatformResult;
  totalAccounts: number;
  totalSynced: number;
  totalErrors: number;
}

interface BatchSyncResponse {
  success: boolean;
  message: string;
  results: BatchSyncResults;
  completedAt: string;
}

export function useBatchSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<BatchSyncResponse | null>(null);
  const queryClient = useQueryClient();

  const syncAllAccounts = async (): Promise<BatchSyncResponse | null> => {
    setIsSyncing(true);

    const toastId = toast.loading("Sincronizando Instagram...", {
      description: "Isso pode levar alguns minutos",
    });

    try {
      // Only Instagram
      const { data: igAccounts, error: igError } = await supabase
        .from("instagram_accounts")
        .select("id, username")
        .eq("is_active", true);

      if (igError) throw new Error(igError.message);

      const accounts = igAccounts ?? [];
      const results: PlatformResult = { synced: 0, errors: 0, accounts: [] };

      for (const account of accounts) {
        const username = account.username;
        try {
          const { error } = await supabase.functions.invoke("instagram-scrape-native", {
            body: { accountId: account.id, username, fetchVideos: true },
          });

          if (error) throw new Error(error.message);

          results.synced += 1;
          results.accounts.push(username);
        } catch (e: any) {
          results.errors += 1;
          results.accounts.push(`${username} (erro)`);
          console.error("Instagram sync error:", username, e);
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 400));
      }

      const totalAccounts = accounts.length;
      const totalSynced = results.synced;
      const totalErrors = results.errors;

      const result: BatchSyncResponse = {
        success: totalErrors === 0,
        message:
          totalErrors === 0
            ? "Sincronização do Instagram concluída"
            : `Sincronização concluída com ${totalErrors} erro(s)` ,
        results: {
          instagram: results,
          totalAccounts,
          totalSynced,
          totalErrors,
        },
        completedAt: new Date().toISOString(),
      };

      setLastSyncResult(result);

      // Refresh Instagram queries only
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-accounts-all"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-videos"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-videos-all"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-metrics-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["pending-accounts"] }),
      ]);

      if (result.success) {
        toast.success("Sincronização concluída!", {
          id: toastId,
          description: `${totalSynced}/${totalAccounts} contas atualizadas`,
        });
      } else {
        toast.error("Sincronização concluída com erros", {
          id: toastId,
          description: `${totalSynced}/${totalAccounts} atualizadas, ${totalErrors} falharam`,
        });
      }

      return result;
    } catch (error: any) {
      console.error("Batch sync error:", error);
      toast.error("Erro ao sincronizar", {
        id: toastId,
        description: error.message,
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncAllAccounts,
    isSyncing,
    lastSyncResult,
  };
}
