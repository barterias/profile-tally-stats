import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncMetrics } from "@/hooks/useSyncMetrics";

interface SyncMetricsButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function SyncMetricsButton({ 
  variant = "outline", 
  size = "default",
  showLabel = true 
}: SyncMetricsButtonProps) {
  const { syncMetrics, isSyncing, lastSyncResult } = useSyncMetrics();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => syncMetrics()}
      disabled={isSyncing}
      className="relative"
    >
      <RefreshCw className={`h-4 w-4 ${showLabel ? 'mr-2' : ''} ${isSyncing ? 'animate-spin' : ''}`} />
      {showLabel && (isSyncing ? 'Sincronizando...' : 'Sincronizar Métricas')}
      
      {lastSyncResult && !isSyncing && (
        <span className="absolute -top-1 -right-1">
          {lastSyncResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </span>
      )}
    </Button>
  );
}
