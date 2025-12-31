import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Users, Eye, ThumbsUp, Video, Clock, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import {
  useYouTubeAccounts,
  useAllYouTubeAccounts,
  useAddYouTubeAccount,
  useSyncYouTubeAccount,
  useSyncAllYouTubeAccounts,
  useDeleteYouTubeAccount,
} from '@/hooks/useYouTubeAccounts';
import { useYouTubeVideos, useAllYouTubeVideos } from '@/hooks/useYouTubeVideos';
import { useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function YouTubeTab() {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { isClipper, isAdmin, isClient } = useUserRole();
  const { t } = useLanguage();

  // Realtime: refresh YouTube accounts/videos list when background sync updates rows
  useEffect(() => {
    const channel = supabase
      .channel('realtime-youtube')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'youtube_accounts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['youtube-accounts-all'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'youtube_videos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['youtube-videos'] });
          queryClient.invalidateQueries({ queryKey: ['youtube-videos-all'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Always call both hooks to respect Rules of Hooks
  const userAccountsQuery = useYouTubeAccounts();
  const allAccountsQuery = useAllYouTubeAccounts();
  
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

  const { data: videos = [], isLoading: videosLoading } = useYouTubeVideos(selectedAccount?.id || '');
  
  // Get all videos for the visible accounts to calculate total views from content
  const accountIds = accounts.map(acc => acc.id);
  const { data: allVideos = [], isLoading: allVideosLoading } = useAllYouTubeVideos(accountIds);

  const addAccount = useAddYouTubeAccount();
  const syncAccount = useSyncYouTubeAccount();
  const syncAllAccounts = useSyncAllYouTubeAccounts();
  const deleteAccount = useDeleteYouTubeAccount();
  const approveAccount = useApproveAccount();
  const rejectAccount = useRejectAccount();

  const handleAddAccount = (username: string) => {
    addAccount.mutate({ username, isClientOrAdmin: isAdmin || isClient }, {
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
    if (confirm(t('analytics.confirm_remove_channel'))) {
      deleteAccount.mutate(accountId);
    }
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
    approveAccount.mutate({ accountId, platform: 'youtube' });
  };

  const handleReject = (accountId: string) => {
    if (confirm(t('analytics.confirm_reject_channel'))) {
      rejectAccount.mutate({ accountId, platform: 'youtube' });
    }
  };

  // All accounts are visible - clippers see theirs, admins/clients see all
  const visibleAccounts = accounts;

  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.total_views || 0) - Number(a.total_views || 0));
  const totalSubscribers = visibleAccounts.reduce((sum, acc) => sum + (acc.subscribers_count || 0), 0);
  // Use account's total_views (from profile) as it's more accurate than sum of scraped videos
  const totalViews = visibleAccounts.reduce((sum, acc) => sum + Number(acc.total_views || 0), 0);
  const totalVideos = visibleAccounts.reduce((sum, acc) => sum + (acc.videos_count || 0), 0);

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
            {t('analytics.update_all')}
          </Button>
        )}
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('analytics.add_channel')}
        </Button>
      </div>

        {isClipper && accounts.length > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('analytics.approval_pending_channel')}
            </p>
          </CardContent>
        </Card>
      )}

      {accountsLoading || allVideosLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32" />))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCardGlow title={t('analytics.subscribers')} value={formatNumber(totalSubscribers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.total_views')} value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.videos')} value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.channels')} value={visibleAccounts.length.toString()} icon={ThumbsUp} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
        <p className="text-sm font-medium text-primary text-center">
          ⚠️ Para visualizar mais vídeos, entre no perfil
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.monitored_channels')}</CardTitle>
          <CardDescription>
            {isClipper ? t('analytics.your_youtube') : t('analytics.sorted_by_views')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClipper ? (
            <div className="space-y-3">
              {sortedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum canal adicionado ainda
                </p>
              ) : (
                sortedAccounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      {acc.profile_image_url ? (
                        <img 
                          src={acc.profile_image_url} 
                          alt={acc.username}
                          className="h-10 w-10 rounded-full object-cover border-2 border-red-500/30"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold ${acc.profile_image_url ? 'hidden' : ''}`}>
                        {acc.username?.[0]?.toUpperCase() || 'Y'}
                      </div>
                      <div>
                        <p className="font-medium">{acc.display_name || acc.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.subscribers_count?.toLocaleString() || 0} inscritos
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
              platform="youtube"
              accounts={sortedAccounts.map((acc: any) => ({
                id: acc.id, username: acc.username, displayName: acc.display_name, profileImageUrl: acc.profile_image_url,
                followersCount: acc.subscribers_count, postsCount: acc.videos_count, scrapedCount: acc.scraped_videos_count || 0,
                totalViews: acc.total_views,
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

      <AddAccountModal platform="youtube" open={addModalOpen} onOpenChange={setAddModalOpen} onAdd={handleAddAccount} isLoading={addAccount.isPending} />
      
      <AccountVideosModal
        platform="youtube"
        accountName={selectedAccount?.username || ''}
        accountId={selectedAccount?.id}
        videos={videos.map(v => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnail_url, viewsCount: v.views_count || 0, likesCount: v.likes_count || 0, commentsCount: v.comments_count || 0, videoUrl: v.video_url, postedAt: v.published_at }))}
        isLoading={videosLoading}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />
    </div>
  );
}
