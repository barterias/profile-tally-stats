import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
  historyRecords: number;
  totalVideos: number;
  externalVideos: number;
}

export function useSyncMetrics() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncMetrics = async (): Promise<SyncResult | null> => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-video-metrics");

      if (error) {
        throw new Error(error.message);
      }

      const result = data as SyncResult;
      setLastSyncResult(result);

      if (result.success) {
        toast.success(`Sincronizado: ${result.synced} vídeos atualizados`);
      } else {
        toast.error(`Erro na sincronização: ${result.message}`);
      }

      return result;
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(`Erro ao sincronizar: ${error.message}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncMetrics,
    isSyncing,
    lastSyncResult,
  };
}
