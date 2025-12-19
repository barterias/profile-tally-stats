import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  RefreshCw, 
  Plus, 
  ArrowLeft,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useSocialAccounts, 
  useMetricsSummary, 
  useMetricsHistory,
  useDisconnectAccount,
  useConnectAccount,
  useTriggerSync
} from '@/hooks/useSocialMedia';
import { SocialMetricsCards } from '@/components/SocialMedia/SocialMetricsCards';
import { SocialAccountsTable } from '@/components/SocialMedia/SocialAccountsTable';
import { SocialGrowthChart } from '@/components/SocialMedia/SocialGrowthChart';
import { PlatformDistributionChart } from '@/components/SocialMedia/PlatformDistributionChart';
import { ConnectAccountModal } from '@/components/SocialMedia/ConnectAccountModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SocialDashboard() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useSocialAccounts();
  const { data: summary, isLoading: summaryLoading } = useMetricsSummary();
  const { data: chartData, isLoading: chartLoading } = useMetricsHistory(7);
  
  const disconnectMutation = useDisconnectAccount();
  const connectMutation = useConnectAccount();
  const syncMutation = useTriggerSync();

  const handleDisconnect = (accountId: string) => {
    if (confirm('Tem certeza que deseja desconectar esta conta?')) {
      disconnectMutation.mutate(accountId);
    }
  };

  const handleViewDetails = (accountId: string) => {
    toast.info('Detalhes da conta em desenvolvimento');
  };

  const handleSync = () => {
    // For mock data, just show a toast
    toast.success('Sincronização simulada com sucesso! Configure sua API Python para sincronização real.');
  };

  const connectedPlatforms = accounts?.map(a => a.platform) || [];
  const lastSync = accounts?.[0]?.last_synced_at;

  return (
    <div className="min-h-screen bg-background gradient-bg-dark">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Dashboard Social Media
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitore todas as suas redes sociais em um só lugar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSync && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Última sync: {format(new Date(lastSync), "dd/MM HH:mm", { locale: ptBR })}
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
            <Button 
              onClick={() => setConnectModalOpen(true)}
              className="gap-2 premium-gradient text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Conectar Conta</span>
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <SocialMetricsCards summary={summary} isLoading={summaryLoading} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <SocialGrowthChart data={chartData || []} isLoading={chartLoading} />
          </div>
          <div>
            <PlatformDistributionChart accounts={accounts || []} isLoading={accountsLoading} />
          </div>
        </div>

        {/* Accounts Table */}
        <Card className="glass-card mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Contas Conectadas
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {accounts?.length || 0} conta(s)
            </span>
          </CardHeader>
          <CardContent>
            <SocialAccountsTable
              accounts={accounts || []}
              isLoading={accountsLoading}
              onDisconnect={handleDisconnect}
              onViewDetails={handleViewDetails}
            />
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="glass-card mt-6 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Sincronização Automática</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure seu backend Python (FastAPI) para sincronizar automaticamente a cada 6 horas.
                  O frontend está preparado para consumir a API em <code className="text-primary">VITE_SOCIAL_API_URL</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connect Modal */}
        <ConnectAccountModal
          open={connectModalOpen}
          onOpenChange={setConnectModalOpen}
          onConnect={(platform) => {
            toast.info(`OAuth para ${platform} deve ser configurado no backend Python`);
            setConnectModalOpen(false);
          }}
          isConnecting={connectMutation.isPending}
          connectedPlatforms={connectedPlatforms}
        />
      </div>
    </div>
  );
}
