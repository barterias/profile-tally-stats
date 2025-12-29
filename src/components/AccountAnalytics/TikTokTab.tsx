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
  useSyncAllTikTokAccounts,
  useDeleteTikTokAccount,
} from '@/hooks/useTikTokAccounts';
import { useTikTokVideos, useAllTikTokVideos } from '@/hooks/useTikTokVideos';
import { useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function TikTokTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { isClipper, isAdmin, isClient } = useUserRole();
  const { t } = useLanguage();

  // Always call both hooks to respect Rules of Hooks
  const userAccountsQuery = useTikTokAccounts();
  const allAccountsQuery = useAllTikTokAccounts();
  
  // Select the appropriate data based on role
  const { data: rawAccounts = [], isLoading: accountsLoading } = (isAdmin || isClient) 
    ? allAccountsQuery 
    : userAccountsQuery;

  // Deduplicate accounts by username - keep only the first occurrence (most recent)
  const accounts = (isAdmin || isClient)
    ? rawAccounts.filter((account, index, self) => 
        index === self.findIndex(a => a.username === account.username)
      )
    : rawAccounts;

  const { data: videos = [], isLoading: videosLoading } = useTikTokVideos(selectedAccount?.id || '');
  const { data: allVideosViews = [] } = useAllTikTokVideos();

  // Derive views and video counts from actual tiktok_videos table
  const { derivedViewsByAccount, videoCountByAccount } = allVideosViews.reduce<{ derivedViewsByAccount: Record<string, number>; videoCountByAccount: Record<string, number> }>(
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

  const addAccount = useAddTikTokAccount();
  const syncAccount = useSyncTikTokAccount();
  const syncAllAccounts = useSyncAllTikTokAccounts();
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

  const handleSyncAccount = (accountId: string) => 
    syncAccount.mutate({ accountId });
  const handleDeleteAccount = (accountId: string) => {
    if (confirm(t('analytics.confirm_remove_account'))) deleteAccount.mutate(accountId);
  };

  const handleViewVideos = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => {
    const accountsToSync = accounts.map(acc => ({ id: acc.id, username: acc.username }));
    syncAllAccounts.mutate(accountsToSync);
  };

  const handleApprove = (accountId: string) => {
    approveAccount.mutate({ accountId, platform: 'tiktok' });
  };

  const handleReject = (accountId: string) => {
    if (confirm(t('analytics.confirm_reject_account'))) {
      rejectAccount.mutate({ accountId, platform: 'tiktok' });
    }
  };

  // All accounts are visible - clippers see theirs, admins/clients see all
  const visibleAccounts = accounts;

  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.likes_count || 0) - Number(a.likes_count || 0));
  const totalFollowers = visibleAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
  const totalLikes = visibleAccounts.reduce((sum, acc) => sum + Number(acc.likes_count || 0), 0);
  const totalVideos = visibleAccounts.reduce((sum, acc) => sum + (videoCountByAccount[acc.id] || 0), 0);
  const totalViews = visibleAccounts.reduce((sum, acc: any) => {
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
      return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />{t('badge.approved')}</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('badge.pending')}</Badge>;
    }
    return <Badge variant="destructive">{t('badge.rejected')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {(isAdmin || isClient) && (
          <Button variant="outline" onClick={handleSyncAll} disabled={accounts.length === 0 || syncAllAccounts.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllAccounts.isPending ? 'animate-spin' : ''}`} />
            {t('analytics.update_all_fem')}
          </Button>
        )}
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('analytics.add_account')}
        </Button>
      </div>

        {isClipper && accounts.length > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('analytics.approval_pending')}
            </p>
          </CardContent>
        </Card>
      )}

      {accountsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32" />))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCardGlow title={t('analytics.followers')} value={formatNumber(totalFollowers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.total_likes')} value={formatNumber(totalLikes)} icon={Heart} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Views Totais" value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.videos')} value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.accounts')} value={visibleAccounts.length.toString()} icon={Users} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.monitored_accounts')}</CardTitle>
          <CardDescription>
            {isClipper ? t('analytics.your_tiktok') : t('analytics.sorted_by_likes')}
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
                 followersCount: acc.followers_count, postsCount: videoCountByAccount[acc.id] || 0, likesCount: acc.likes_count,
                 totalViews: Number(acc.total_views || 0) > 0 ? acc.total_views : (derivedViewsByAccount[acc.id] || 0),
                 scrapedCount: acc.scraped_videos_count || 0,
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
