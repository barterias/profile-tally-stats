import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Linkedin,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSocialAccounts, useDisconnectAccount } from '@/hooks/useSocialMedia';
import { ConnectAccountModal } from '@/components/SocialMedia/ConnectAccountModal';
import type { SocialPlatform, SocialAccountWithMetrics } from '@/types/socialMedia';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  tiktok: Music,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
};

const platformGradients: Record<SocialPlatform, string> = {
  tiktok: 'from-foreground to-muted-foreground',
  instagram: 'from-purple-500 via-pink-500 to-orange-400',
  youtube: 'from-red-600 to-red-500',
  twitter: 'from-foreground to-muted-foreground',
  facebook: 'from-blue-600 to-blue-500',
  linkedin: 'from-blue-700 to-blue-600',
};

export default function SocialAccounts() {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: SocialAccountWithMetrics | null }>({
    open: false,
    account: null,
  });

  const { data: accounts, isLoading } = useSocialAccounts();
  const disconnectMutation = useDisconnectAccount();

  const handleDisconnect = () => {
    if (deleteDialog.account) {
      disconnectMutation.mutate(deleteDialog.account.id);
      setDeleteDialog({ open: false, account: null });
    }
  };

  const connectedPlatforms = accounts?.map(a => a.platform) || [];

  return (
    <div className="min-h-screen bg-background gradient-bg-dark">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/social">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Contas Conectadas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie suas redes sociais conectadas
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setConnectModalOpen(true)}
            className="gap-2 premium-gradient text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Conectar</span>
          </Button>
        </div>

        {/* Accounts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts?.length === 0 ? (
          <Card className="glass-card text-center py-12">
            <CardContent>
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma conta conectada
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Conecte suas redes sociais para começar a monitorar métricas
              </p>
              <Button 
                onClick={() => setConnectModalOpen(true)}
                className="gap-2 premium-gradient text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Conectar Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts?.map((account, index) => {
              const PlatformIcon = platformIcons[account.platform];
              
              return (
                <Card 
                  key={account.id}
                  className="glass-card glass-card-hover overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Platform Icon */}
                        <div className={cn(
                          "p-3 rounded-xl bg-gradient-to-br shrink-0",
                          platformGradients[account.platform]
                        )}>
                          <PlatformIcon className="h-6 w-6 text-background" />
                        </div>

                        {/* Account Info */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={account.profile_image_url} />
                            <AvatarFallback>
                              {account.account_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {account.account_name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {account.account_username}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Conectado em {format(new Date(account.connected_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('Sincronização individual em desenvolvimento')}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span className="hidden sm:inline">Sync</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, account })}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Desconectar</span>
                        </Button>
                      </div>
                    </div>

                    {/* Metrics Summary */}
                    {account.metrics && (
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {account.metrics.followers.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">Seguidores</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {account.metrics.views.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {account.metrics.likes.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">Curtidas</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {account.metrics.engagement_rate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Engajamento</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Connect Modal */}
        <ConnectAccountModal
          open={connectModalOpen}
          onOpenChange={setConnectModalOpen}
          onConnect={(platform) => {
            toast.info(`OAuth para ${platform} deve ser configurado no backend Python`);
            setConnectModalOpen(false);
          }}
          isConnecting={false}
          connectedPlatforms={connectedPlatforms}
        />

        {/* Delete Confirmation */}
        <AlertDialog 
          open={deleteDialog.open} 
          onOpenChange={(open) => setDeleteDialog({ open, account: null })}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a desconectar <strong>{deleteDialog.account?.account_name}</strong>.
                O histórico de métricas será mantido, mas não haverá mais atualizações automáticas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDisconnect}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
