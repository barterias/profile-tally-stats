import { useState } from 'react';
import { Plus, RefreshCw, Users, Heart, Eye, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import {
  useTikTokAccounts,
  useAllTikTokAccounts,
  useAddTikTokAccount,
  useSyncTikTokAccount,
  useDeleteTikTokAccount,
} from '@/hooks/useTikTokAccounts';
import { useTikTokVideos } from '@/hooks/useTikTokVideos';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function TikTokTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  const { data: accounts = [], isLoading: accountsLoading } = isAdmin
    ? useAllTikTokAccounts()
    : useTikTokAccounts();

  const { data: videos = [], isLoading: videosLoading } = useTikTokVideos(selectedAccount?.id || '');

  const addAccount = useAddTikTokAccount();
  const syncAccount = useSyncTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();

  const handleAddAccount = (username: string) => {
    addAccount.mutate(username, {
      onSuccess: (result) => {
        if (result.success) setAddModalOpen(false);
      },
    });
  };

  const handleSyncAccount = (accountId: string) => syncAccount.mutate(accountId);
  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Tem certeza que deseja remover esta conta?')) deleteAccount.mutate(accountId);
  };

  const handleViewVideos = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => accounts.forEach((account) => syncAccount.mutate(account.id));

  const sortedAccounts = [...accounts].sort((a, b) => Number(b.likes_count || 0) - Number(a.likes_count || 0));
  const totalFollowers = accounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
  const totalLikes = accounts.reduce((sum, acc) => sum + Number(acc.likes_count || 0), 0);
  const totalVideos = accounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSyncAll} disabled={accounts.length === 0 || syncAccount.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
          Atualizar Todas
        </Button>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conta
        </Button>
      </div>

      {accountsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32" />))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCardGlow title="Seguidores" value={formatNumber(totalFollowers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Curtidas Totais" value={formatNumber(totalLikes)} icon={Heart} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Vídeos" value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Contas" value={accounts.length.toString()} icon={Eye} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas Monitoradas</CardTitle>
          <CardDescription>Ordenadas por curtidas totais</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformAccountsTable
            platform="tiktok"
            accounts={sortedAccounts.map(acc => ({
              id: acc.id, username: acc.username, displayName: acc.display_name, profileImageUrl: acc.profile_image_url,
              followersCount: acc.followers_count, postsCount: acc.videos_count, likesCount: acc.likes_count,
              lastSyncedAt: acc.last_synced_at, isActive: acc.is_active,
            }))}
            isLoading={accountsLoading}
            onSync={handleSyncAccount}
            onDelete={handleDeleteAccount}
            onViewVideos={handleViewVideos}
            isSyncing={syncAccount.isPending}
          />
        </CardContent>
      </Card>

      <AddAccountModal platform="tiktok" open={addModalOpen} onOpenChange={setAddModalOpen} onAdd={handleAddAccount} isLoading={addAccount.isPending} />
      
      <AccountVideosModal
        platform="tiktok"
        accountName={selectedAccount?.username || ''}
        accountId={selectedAccount?.id}
        videos={videos.map(v => ({ id: v.id, caption: v.caption, thumbnailUrl: v.thumbnail_url, viewsCount: v.views_count || 0, likesCount: v.likes_count || 0, commentsCount: v.comments_count || 0, sharesCount: v.shares_count || 0, videoUrl: v.video_url, postedAt: v.posted_at }))}
        isLoading={videosLoading}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />
    </div>
  );
}
