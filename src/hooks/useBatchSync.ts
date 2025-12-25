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
  youtube: PlatformResult;
  tiktok: PlatformResult;
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
    
    const toastId = toast.loading("Sincronizando todas as contas...", {
      description: "Isso pode levar alguns minutos",
    });

    try {
      const { data, error } = await supabase.functions.invoke("sync-all-accounts");

      if (error) {
        throw new Error(error.message);
      }

      const result = data as BatchSyncResponse;
      setLastSyncResult(result);

      if (result.success) {
        // Invalidate all related queries to refresh UI
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] }),
          queryClient.invalidateQueries({ queryKey: ["instagram-posts"] }),
          queryClient.invalidateQueries({ queryKey: ["instagram-videos"] }),
          queryClient.invalidateQueries({ queryKey: ["youtube-accounts"] }),
          queryClient.invalidateQueries({ queryKey: ["youtube-videos"] }),
          queryClient.invalidateQueries({ queryKey: ["tiktok-accounts"] }),
          queryClient.invalidateQueries({ queryKey: ["tiktok-videos"] }),
          queryClient.invalidateQueries({ queryKey: ["social-metrics"] }),
          queryClient.invalidateQueries({ queryKey: ["pending-accounts"] }),
        ]);

        toast.success("Sincronização concluída!", {
          id: toastId,
          description: `${result.results.totalSynced}/${result.results.totalAccounts} contas atualizadas`,
        });
      } else {
        toast.error("Erro na sincronização", {
          id: toastId,
          description: result.message,
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
