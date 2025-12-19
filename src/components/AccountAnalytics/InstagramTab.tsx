import { useState } from 'react';
import { Plus, RefreshCw, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InstagramMetricsCards } from '@/components/Instagram/InstagramMetricsCards';
import { InstagramAccountsTable } from '@/components/Instagram/InstagramAccountsTable';
import { AddInstagramAccountModal } from '@/components/Instagram/AddInstagramAccountModal';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import {
  useInstagramAccounts,
  useAllInstagramAccounts,
  useInstagramMetricsSummary,
  useAddInstagramAccount,
  useSyncInstagramAccount,
  useDeleteInstagramAccount,
} from '@/hooks/useInstagramAccounts';
import { useInstagramVideos } from '@/hooks/useInstagramVideos';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function InstagramTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  const { data: accounts = [], isLoading: accountsLoading } = isAdmin
    ? useAllInstagramAccounts()
    : useInstagramAccounts();

  const { data: metrics, isLoading: metricsLoading } = useInstagramMetricsSummary(
    isAdmin ? undefined : user?.id
  );

  const { data: posts = [], isLoading: postsLoading } = useInstagramVideos(selectedAccount?.id || '');

  const addAccount = useAddInstagramAccount();
  const syncAccount = useSyncInstagramAccount();
  const deleteAccount = useDeleteInstagramAccount();

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
    if (confirm('Tem certeza que deseja remover esta conta?')) {
      deleteAccount.mutate(accountId);
    }
  };

  const handleViewPosts = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => {
    accounts.forEach((account) => {
      syncAccount.mutate(account.id);
    });
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
          Atualizar Todas
        </Button>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conta
        </Button>
      </div>

      {/* Metrics Cards */}
      <InstagramMetricsCards
        totalFollowers={metrics?.totalFollowers || 0}
        totalLikes={metrics?.totalLikes || 0}
        totalComments={metrics?.totalComments || 0}
        totalViews={metrics?.totalViews || 0}
        accountsCount={metrics?.accountsCount || 0}
        isLoading={metricsLoading}
      />

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas Monitoradas</CardTitle>
          <CardDescription>
            Lista de todas as contas do Instagram sendo monitoradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstagramAccountsTable
            accounts={accounts}
            isLoading={accountsLoading}
            onSync={handleSyncAccount}
            onDelete={handleDeleteAccount}
            onViewPosts={handleViewPosts}
            isSyncing={syncAccount.isPending}
          />
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <AddInstagramAccountModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddAccount}
        isLoading={addAccount.isPending}
      />

      {/* Posts Modal */}
      <AccountVideosModal
        platform="instagram"
        accountName={selectedAccount?.username || ''}
        accountId={selectedAccount?.id}
        videos={posts.map(p => ({
          id: p.id,
          caption: p.caption,
          thumbnailUrl: p.thumbnail_url,
          viewsCount: p.views_count || 0,
          likesCount: p.likes_count || 0,
          commentsCount: p.comments_count || 0,
          sharesCount: p.shares_count || 0,
          videoUrl: p.post_url,
          postedAt: p.posted_at,
        }))}
        isLoading={postsLoading}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />
    </div>
  );
}
