import { RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBatchSync } from "@/hooks/useBatchSync";

interface BatchSyncButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function BatchSyncButton({ 
  variant = "default", 
  size = "default",
  showLabel = true 
}: BatchSyncButtonProps) {
  const { syncAllAccounts, isSyncing, lastSyncResult } = useBatchSync();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => syncAllAccounts()}
      disabled={isSyncing}
      className="relative"
    >
      <Database className={`h-4 w-4 ${showLabel ? 'mr-2' : ''}`} />
      <RefreshCw className={`h-4 w-4 ${showLabel ? 'mr-1' : ''} ${isSyncing ? 'animate-spin' : 'hidden'}`} />
      {showLabel && (isSyncing ? 'Sincronizando Tudo...' : 'Sync Todas as Contas')}
      
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
