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
  useTikTokAccounts,
  useAllTikTokAccounts,
  useAddTikTokAccount,
  useSyncTikTokAccount,
  useDeleteTikTokAccount,
} from '@/hooks/useTikTokAccounts';
import { useTikTokVideos } from '@/hooks/useTikTokVideos';
import { useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function TikTokTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { isClipper, isAdmin, isClient } = useUserRole();

  // Always call both hooks to respect Rules of Hooks
  const userAccountsQuery = useTikTokAccounts();
  const allAccountsQuery = useAllTikTokAccounts();
  
  // Select the appropriate data based on role
  const { data: accounts = [], isLoading: accountsLoading } = (isAdmin || isClient) 
    ? allAccountsQuery 
    : userAccountsQuery;

  const { data: videos = [], isLoading: videosLoading } = useTikTokVideos(selectedAccount?.id || '');

  const addAccount = useAddTikTokAccount();
  const syncAccount = useSyncTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();
  const approveAccount = useApproveAccount();
  const rejectAccount = useRejectAccount();

  const handleAddAccount = (username: string) => {
    addAccount.mutate({ username, isClientOrAdmin: isAdmin || isClient }, {
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

  const handleApprove = (accountId: string) => {
    approveAccount.mutate({ accountId, platform: 'tiktok' });
  };

  const handleReject = (accountId: string) => {
    if (confirm('Tem certeza que deseja rejeitar esta conta?')) {
      rejectAccount.mutate({ accountId, platform: 'tiktok' });
    }
  };

  // All accounts are visible - clippers see theirs, admins/clients see all
  const visibleAccounts = accounts;

  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.likes_count || 0) - Number(a.likes_count || 0));
  const totalFollowers = visibleAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
  const totalLikes = visibleAccounts.reduce((sum, acc) => sum + Number(acc.likes_count || 0), 0);
  const totalVideos = visibleAccounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

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
          <Button variant="outline" onClick={handleSyncAll} disabled={accounts.length === 0 || syncAccount.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
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
              Suas contas precisam ser aprovadas por um administrador antes de aparecerem nos relatórios.
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
          <MetricCardGlow title="Seguidores" value={formatNumber(totalFollowers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Curtidas Totais" value={formatNumber(totalLikes)} icon={Heart} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Vídeos" value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Contas" value={visibleAccounts.length.toString()} icon={Eye} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas Monitoradas</CardTitle>
          <CardDescription>
            {isClipper ? 'Suas contas do TikTok' : 'Ordenadas por curtidas totais'}
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
                      <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center text-background font-bold">
                        {acc.username?.[0]?.toUpperCase() || 'T'}
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
              platform="tiktok"
              accounts={sortedAccounts.map((acc: any) => ({
                id: acc.id, username: acc.username, displayName: acc.display_name, profileImageUrl: acc.profile_image_url,
                followersCount: acc.followers_count, postsCount: acc.videos_count, likesCount: acc.likes_count,
                lastSyncedAt: acc.last_synced_at, isActive: acc.is_active, approvalStatus: acc.approval_status,
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
