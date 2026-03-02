import { useState } from 'react';
import { Plus, RefreshCw, Users, Heart, Eye, Video, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import {
  useKwaiAccounts,
  useAllKwaiAccounts,
  useAddKwaiAccount,
  useSyncKwaiAccount,
  useSyncAllKwaiAccounts,
  useDeleteKwaiAccount,
} from '@/hooks/useKwaiAccounts';
import { useKwaiVideos, useAllKwaiVideos } from '@/hooks/useKwaiVideos';
import { useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useClientFilter } from '@/pages/AccountAnalytics';

export function KwaiTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { isClipper, isAdmin, isClient } = useUserRole();
  const clientFilterUserIds = useClientFilter();

  const userAccountsQuery = useKwaiAccounts();
  const allAccountsQuery = useAllKwaiAccounts();

  const { data: rawAccounts = [], isLoading: accountsLoading } = (isAdmin || isClient)
    ? allAccountsQuery
    : userAccountsQuery;

  let accounts = (isAdmin || isClient)
    ? rawAccounts.filter((account, index, self) =>
        index === self.findIndex((a: any) => a.username === account.username)
      )
    : rawAccounts;

  if (clientFilterUserIds && clientFilterUserIds.length > 0) {
    accounts = accounts.filter((acc: any) => clientFilterUserIds.includes(acc.user_id));
  } else if (clientFilterUserIds && clientFilterUserIds.length === 0 && isClient) {
    accounts = [];
  }

  const { data: videos = [], isLoading: videosLoading } = useKwaiVideos(selectedAccount?.id || '');
  const { data: allVideosViews = [] } = useAllKwaiVideos();

  const { derivedViewsByAccount, videoCountByAccount } = allVideosViews.reduce<{
    derivedViewsByAccount: Record<string, number>;
    videoCountByAccount: Record<string, number>;
  }>(
    (acc, row: any) => {
      const accountId = row?.account_id;
      const views = Number(row?.views_count || 0);
      if (accountId) {
        acc.derivedViewsByAccount[accountId] = (acc.derivedViewsByAccount[accountId] || 0) + views;
        acc.videoCountByAccount[accountId] = (acc.videoCountByAccount[accountId] || 0) + 1;
      }
      return acc;
    },
    { derivedViewsByAccount: {}, videoCountByAccount: {} }
  );

  const addAccount = useAddKwaiAccount();
  const syncAccount = useSyncKwaiAccount();
  const syncAllAccounts = useSyncAllKwaiAccounts();
  const deleteAccount = useDeleteKwaiAccount();
  const approveAccount = useApproveAccount();
  const rejectAccount = useRejectAccount();

  const handleAddAccount = (username: string) => {
    addAccount.mutate({ username, isClientOrAdmin: isAdmin || isClient }, {
      onSuccess: (result: any) => {
        if (result.success) setAddModalOpen(false);
      },
    });
  };

  const handleSyncAccount = (accountId: string) => syncAccount.mutate({ accountId });

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Tem certeza que deseja remover esta conta?')) deleteAccount.mutate(accountId);
  };

  const handleViewVideos = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => {
    const accountsToSync = accounts.map((acc: any) => ({ id: acc.id, username: acc.username }));
    syncAllAccounts.mutate(accountsToSync);
  };

  const handleApprove = (accountId: string) => {
    approveAccount.mutate({ accountId, platform: 'kwai' }, {
      onSuccess: () => {
        // Auto-sync after approval to fetch metrics
        syncAccount.mutate({ accountId });
      },
    });
  };

  const handleReject = (accountId: string) => {
    if (confirm('Tem certeza que deseja rejeitar esta conta?')) {
      rejectAccount.mutate({ accountId, platform: 'kwai' });
    }
  };

  // Derive likes per account from videos when account-level likes_count is 0
  const { derivedLikesByAccount } = allVideosViews.reduce<{
    derivedLikesByAccount: Record<string, number>;
  }>(
    (acc, row: any) => {
      const accountId = row?.account_id;
      const likes = Number(row?.likes_count || 0);
      if (accountId) {
        acc.derivedLikesByAccount[accountId] = (acc.derivedLikesByAccount[accountId] || 0) + likes;
      }
      return acc;
    },
    { derivedLikesByAccount: {} }
  );

  const getAccountLikes = (acc: any) => {
    const stored = Number(acc.likes_count || 0);
    return stored > 0 ? stored : (derivedLikesByAccount[acc.id] || 0);
  };

  const sortedAccounts = [...accounts].sort((a: any, b: any) => getAccountLikes(b) - getAccountLikes(a));
  const totalFollowers = accounts.reduce((sum: number, acc: any) => sum + (acc.followers_count || 0), 0);
  const totalLikes = accounts.reduce((sum: number, acc: any) => sum + getAccountLikes(acc), 0);
  const totalVideos = accounts.reduce((sum: number, acc: any) => sum + (videoCountByAccount[acc.id] || 0), 0);
  const totalViews = accounts.reduce((sum: number, acc: any) => {
    const derived = derivedViewsByAccount[acc.id] || 0;
    const stored = Number(acc.total_views || 0);
    return sum + (stored > 0 ? stored : derived);
  }, 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getApprovalBadge = (status: string | undefined) => {
    if (!status || status === 'approved') {
      return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    return <Badge variant="destructive">Rejeitada</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {(isAdmin || isClient) && (
          <Button variant="outline" onClick={handleSyncAll} disabled={accounts.length === 0 || syncAllAccounts.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllAccounts.isPending ? 'animate-spin' : ''}`} />
            Atualizar Todas
          </Button>
        )}
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conta
        </Button>
      </div>

      {isClipper && accounts.length > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Contas adicionadas precisam ser aprovadas por um administrador antes de serem exibidas nas métricas.
            </p>
          </CardContent>
        </Card>
      )}

      {accountsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32" />))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCardGlow title="Curtidas Totais" value={formatNumber(totalLikes)} icon={Heart} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Views Totais" value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Vídeos" value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Contas" value={accounts.length.toString()} icon={Users} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas Monitoradas</CardTitle>
          <CardDescription>
            {isClipper ? 'Suas contas do Kwai' : 'Ordenado por curtidas totais'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClipper ? (
            <div className="space-y-3">
              {sortedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta adicionada ainda
                </p>
              ) : (
                sortedAccounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {acc.username?.[0]?.toUpperCase() || 'K'}
                      </div>
                      <div>
                        <p className="font-medium">@{acc.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.followers_count?.toLocaleString() || 0} seguidores
                        </p>
                      </div>
                    </div>
                    {getApprovalBadge(acc.approval_status)}
                  </div>
                ))
              )}
            </div>
          ) : (
            <PlatformAccountsTable
              platform="kwai"
              accounts={sortedAccounts.map((acc: any) => ({
                id: acc.id,
                username: acc.username,
                displayName: acc.display_name,
                profileImageUrl: acc.profile_image_url,
                followersCount: acc.followers_count,
                postsCount: videoCountByAccount[acc.id] || 0,
                likesCount: getAccountLikes(acc),
                totalViews: Number(acc.total_views || 0) > 0 ? acc.total_views : (derivedViewsByAccount[acc.id] || 0),
                scrapedCount: acc.scraped_videos_count || 0,
                lastSyncedAt: acc.last_synced_at,
                isActive: acc.is_active,
                approvalStatus: acc.approval_status,
              }))}
              isLoading={accountsLoading}
              onSync={handleSyncAccount}
              onDelete={handleDeleteAccount}
              onViewVideos={handleViewVideos}
              onApprove={handleApprove}
              onReject={handleReject}
              isSyncing={syncAccount.isPending}
              showApprovalActions={isAdmin || isClient}
            />
          )}
        </CardContent>
      </Card>

      <AddAccountModal
        platform="kwai"
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddAccount}
        isLoading={addAccount.isPending}
      />

      <AccountVideosModal
        platform="kwai"
        accountName={selectedAccount?.username || ''}
        accountId={selectedAccount?.id}
        videos={videos.map((v: any) => ({
          id: v.id,
          caption: v.caption,
          thumbnailUrl: v.thumbnail_url,
          viewsCount: v.views_count || 0,
          likesCount: v.likes_count || 0,
          commentsCount: v.comments_count || 0,
          sharesCount: v.shares_count || 0,
          videoUrl: v.video_url,
          postedAt: v.posted_at,
        }))}
        isLoading={videosLoading}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />
    </div>
  );
}
