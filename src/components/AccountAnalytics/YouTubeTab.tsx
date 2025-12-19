import { useState } from 'react';
import { Plus, RefreshCw, Users, Eye, ThumbsUp, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import {
  useYouTubeAccounts,
  useAllYouTubeAccounts,
  useAddYouTubeAccount,
  useSyncYouTubeAccount,
  useDeleteYouTubeAccount,
} from '@/hooks/useYouTubeAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function YouTubeTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  const { data: accounts = [], isLoading: accountsLoading } = isAdmin
    ? useAllYouTubeAccounts()
    : useYouTubeAccounts();

  const addAccount = useAddYouTubeAccount();
  const syncAccount = useSyncYouTubeAccount();
  const deleteAccount = useDeleteYouTubeAccount();

  const handleAddAccount = (username: string) => {
    addAccount.mutate(username, {
      onSuccess: (result) => {
        if (result.success) {
          setAddModalOpen(false);
        }
      },
    });
  };

  const handleSyncAccount = (accountId: string) => {
    syncAccount.mutate(accountId);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Tem certeza que deseja remover este canal?')) {
      deleteAccount.mutate(accountId);
    }
  };

  const handleSyncAll = () => {
    accounts.forEach((account) => {
      syncAccount.mutate(account.id);
    });
  };

  // Calculate totals
  const totalSubscribers = accounts.reduce((sum, acc) => sum + (acc.subscribers_count || 0), 0);
  const totalViews = accounts.reduce((sum, acc) => sum + Number(acc.total_views || 0), 0);
  const totalVideos = accounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleSyncAll}
          disabled={accounts.length === 0 || syncAccount.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
          Atualizar Todos
        </Button>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Canal
        </Button>
      </div>

      {/* Metrics Cards */}
      {accountsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCardGlow
            title="Inscritos"
            value={formatNumber(totalSubscribers)}
            icon={Users}
            trend={{ value: 0, isPositive: true }}
          />
          <MetricCardGlow
            title="Visualizações Totais"
            value={formatNumber(totalViews)}
            icon={Eye}
            trend={{ value: 0, isPositive: true }}
          />
          <MetricCardGlow
            title="Vídeos"
            value={formatNumber(totalVideos)}
            icon={Video}
            trend={{ value: 0, isPositive: true }}
          />
          <MetricCardGlow
            title="Canais"
            value={accounts.length.toString()}
            icon={ThumbsUp}
            trend={{ value: 0, isPositive: true }}
          />
        </div>
      )}

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Canais Monitorados</CardTitle>
          <CardDescription>
            Lista de todos os canais do YouTube sendo monitorados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformAccountsTable
            platform="youtube"
            accounts={accounts.map(acc => ({
              id: acc.id,
              username: acc.username,
              displayName: acc.display_name,
              profileImageUrl: acc.profile_image_url,
              followersCount: acc.subscribers_count,
              postsCount: acc.videos_count,
              totalViews: acc.total_views,
              lastSyncedAt: acc.last_synced_at,
              isActive: acc.is_active,
            }))}
            isLoading={accountsLoading}
            onSync={handleSyncAccount}
            onDelete={handleDeleteAccount}
            isSyncing={syncAccount.isPending}
          />
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <AddAccountModal
        platform="youtube"
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddAccount}
        isLoading={addAccount.isPending}
      />
    </div>
  );
}
