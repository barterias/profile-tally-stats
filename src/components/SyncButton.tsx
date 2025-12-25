import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSyncAllProfiles } from '@/hooks/useSyncAllProfiles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showProgress?: boolean;
}

export function SyncButton({ variant = 'outline', size = 'default', showProgress = true }: SyncButtonProps) {
  const { syncAll, isSyncing, progress, results } = useSyncAllProfiles();

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={syncAll}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {size !== 'icon' && (isSyncing ? 'Sincronizando...' : 'Sincronizar Todas')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Atualizar métricas de todas as contas via ScrapeCreators</p>
        </TooltipContent>
      </Tooltip>

      {showProgress && isSyncing && (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      )}

      {showProgress && !isSyncing && results.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              {successCount}
            </span>
          )}
          {failCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="h-3 w-3" />
              {failCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
