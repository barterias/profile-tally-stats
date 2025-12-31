import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Users, Eye, Heart, Video, Clock, CheckCircle, MessageCircle, Link2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import { LinkProfessionalAccountModal } from '@/components/Instagram/LinkProfessionalAccountModal';
import {
  useInstagramAccounts,
  useAllInstagramAccounts,
  useAddInstagramAccount,
  useSyncInstagramAccount,
  useSyncAllInstagramAccounts,
  useDeleteInstagramAccount,
} from '@/hooks/useInstagramAccounts';
import { useInstagramVideos, useAllInstagramVideos } from '@/hooks/useInstagramVideos';
import { useApproveAccount, useRejectAccount } from '@/hooks/usePendingAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function InstagramTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [linkProfessionalModalOpen, setLinkProfessionalModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { role, isClipper, isAdmin, isClient } = useUserRole();
  const { t } = useLanguage();

  // Always call both hooks to respect Rules of Hooks
  const userAccountsQuery = useInstagramAccounts();
  const allAccountsQuery = useAllInstagramAccounts();
  
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

  const { data: posts = [], isLoading: postsLoading } = useInstagramVideos(selectedAccount?.id || '');
  const { data: allPosts = [] } = useAllInstagramVideos();

  const addAccount = useAddInstagramAccount();
  const syncAccount = useSyncInstagramAccount();
  const syncAllAccounts = useSyncAllInstagramAccounts();
  const deleteAccount = useDeleteInstagramAccount();
  const approveAccount = useApproveAccount();
  const rejectAccount = useRejectAccount();

  // Calculate metrics from actual posts in DB
  const { viewsByAccount, postCountByAccount, likesByAccount, commentsByAccount, totalLikes, totalComments } = useMemo(() => {
    const views: Record<string, number> = {};
    const counts: Record<string, number> = {};
    const likes: Record<string, number> = {};
    const comments: Record<string, number> = {};
    let allLikes = 0;
    let allComments = 0;
    
    allPosts.forEach(post => {
      if (post.account_id) {
        views[post.account_id] = (views[post.account_id] || 0) + (post.views_count || 0);
        counts[post.account_id] = (counts[post.account_id] || 0) + 1;
        likes[post.account_id] = (likes[post.account_id] || 0) + (post.likes_count || 0);
        comments[post.account_id] = (comments[post.account_id] || 0) + (post.comments_count || 0);
        allLikes += post.likes_count || 0;
        allComments += post.comments_count || 0;
      }
    });
    return { 
      viewsByAccount: views, 
      postCountByAccount: counts, 
      likesByAccount: likes, 
      commentsByAccount: comments,
      totalLikes: allLikes,
      totalComments: allComments
    };
  }, [allPosts]);

  const handleAddAccount = (username: string) => {
    addAccount.mutate({ username, isClientOrAdmin: isAdmin || isClient }, {
      onSuccess: (result) => {
        if (result.success) {
          setAddModalOpen(false);
        }
      },
    });
  };

  const handleSyncAccount = (accountId: string, continueFrom: boolean = false) => {
    syncAccount.mutate({ accountId, continueFrom });
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm(t('analytics.confirm_remove_account'))) {
      deleteAccount.mutate(accountId);
    }
  };

  const handleViewPosts = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => {
    const accountIds = accounts.map(acc => acc.id);
    syncAllAccounts.mutate(accountIds);
  };

  const handleApprove = (accountId: string) => {
    approveAccount.mutate({ accountId, platform: 'instagram' });
  };

  const handleReject = (accountId: string) => {
    if (confirm(t('analytics.confirm_reject_account'))) {
      rejectAccount.mutate({ accountId, platform: 'instagram' });
    }
  };

  // Clippers see all their accounts (with approval status)
  // Admins and Clients see ALL accounts (including pending ones they need to approve)
  const visibleAccounts = accounts;

  // Calculate totals and sort by followers
  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.followers_count || 0) - Number(a.followers_count || 0));
  const totalFollowers = visibleAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
  // Use account's total_views (from profile) - fallback to derived views from posts
  const totalViews = visibleAccounts.reduce((sum, acc) => {
    const accountViews = Number(acc.total_views || 0);
    const derivedViews = viewsByAccount[acc.id] || 0;
    return sum + (accountViews > 0 ? accountViews : derivedViews);
  }, 0);
  const totalPosts = visibleAccounts.reduce((sum, acc) => sum + (postCountByAccount[acc.id] || acc.posts_count || 0), 0);

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCardGlow title={t('analytics.accounts')} value={visibleAccounts.length.toString()} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.followers')} value={formatNumber(totalFollowers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title={t('analytics.posts')} value={formatNumber(totalPosts)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Curtidas" value={formatNumber(totalLikes)} icon={Heart} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Comentários" value={formatNumber(totalComments)} icon={MessageCircle} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Views (Vídeos)" value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
        <p className="text-sm font-medium text-primary text-center">
          ⚠️ Para visualizar mais vídeos, entre no perfil
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.monitored_accounts')}</CardTitle>
          <CardDescription>
            {isClipper ? t('analytics.your_instagram') : t('analytics.sorted_by_followers')}
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
                  <div key={acc.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-4">
                      {acc.profile_image_url ? (
                        <img 
                          src={acc.profile_image_url} 
                          alt={acc.username}
                          className="h-12 w-12 rounded-full object-cover border-2 border-pink-500/30"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg ${acc.profile_image_url ? 'hidden' : ''}`}>
                        {acc.username?.[0]?.toUpperCase() || 'I'}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{acc.display_name || `@${acc.username}`}</p>
                        <p className="text-sm text-muted-foreground">@{acc.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">{formatNumber(acc.followers_count || 0)}</p>
                        <p className="text-xs text-muted-foreground">Seguidores</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{formatNumber(acc.posts_count || 0)}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                      {getApprovalBadge(acc.approval_status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <PlatformAccountsTable
              platform="instagram"
              accounts={sortedAccounts.map((acc: any) => ({
                id: acc.id, 
                username: acc.username, 
                displayName: acc.display_name, 
                profileImageUrl: acc.profile_image_url,
                followersCount: acc.followers_count, 
                postsCount: acc.posts_count || 0, // Total posts from profile
                scrapedCount: acc.scraped_posts_count || 0,
                totalViews: acc.total_views || viewsByAccount[acc.id] || 0,
                totalLikes: likesByAccount[acc.id] || 0,
                totalComments: commentsByAccount[acc.id] || 0,
                lastSyncedAt: acc.last_synced_at, 
                isActive: acc.is_active, 
                approvalStatus: acc.approval_status,
              }))}
              isLoading={accountsLoading}
              onSync={handleSyncAccount}
              onDelete={handleDeleteAccount}
              onViewVideos={handleViewPosts}
              onApprove={handleApprove}
              onReject={handleReject}
              isSyncing={syncAccount.isPending}
              showApprovalActions={isAdmin || isClient}
            />
          )}
        </CardContent>
      </Card>

      <AddAccountModal platform="instagram" open={addModalOpen} onOpenChange={setAddModalOpen} onAdd={handleAddAccount} isLoading={addAccount.isPending} />
      
      <AccountVideosModal
        platform="instagram"
        accountName={selectedAccount?.username || ''}
        accountId={selectedAccount?.id}
        videos={posts.map(p => ({ id: p.id, title: p.caption, thumbnailUrl: p.thumbnail_url, viewsCount: p.views_count || 0, likesCount: p.likes_count || 0, commentsCount: p.comments_count || 0, videoUrl: p.post_url, postedAt: p.posted_at }))}
        isLoading={postsLoading}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />

      <LinkProfessionalAccountModal
        open={linkProfessionalModalOpen}
        onOpenChange={setLinkProfessionalModalOpen}
      />
    </div>
  );
}
