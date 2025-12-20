import { useState } from 'react';
import { Plus, RefreshCw, Users, Eye, ThumbsUp, Video, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MetricCardGlow } from '@/components/ui/MetricCardGlow';
import { AddAccountModal } from '@/components/AccountAnalytics/AddAccountModal';
import { PlatformAccountsTable } from '@/components/AccountAnalytics/PlatformAccountsTable';
import { AccountVideosModal } from '@/components/AccountAnalytics/AccountVideosModal';
import {
  useInstagramAccounts,
  useAllInstagramAccounts,
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
  const { role, isClipper, isAdmin, isClient } = useUserRole();

  // Always call both hooks to respect Rules of Hooks
  const userAccountsQuery = useInstagramAccounts();
  const allAccountsQuery = useAllInstagramAccounts();
  
  // Select the appropriate data based on role
  const { data: accounts = [], isLoading: accountsLoading } = (isAdmin || isClient) 
    ? allAccountsQuery 
    : userAccountsQuery;

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

  // Clippers see all their accounts (with approval status)
  // Admins and Clients see ALL accounts (including pending ones they need to approve)
  const visibleAccounts = accounts;

  // Calculate totals and sort by followers
  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.followers_count || 0) - Number(a.followers_count || 0));
  const totalFollowers = visibleAccounts.reduce((sum, acc) => sum + (acc.followers_count || 0), 0);
  const totalViews = visibleAccounts.reduce((sum, acc) => sum + (acc.posts_count || 0) * 1000, 0);
  const totalPosts = visibleAccounts.reduce((sum, acc) => sum + (acc.posts_count || 0), 0);

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
          <MetricCardGlow title="Posts" value={formatNumber(totalPosts)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Visualizações Est." value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Contas" value={visibleAccounts.length.toString()} icon={ThumbsUp} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas Monitoradas</CardTitle>
          <CardDescription>
            {isClipper ? 'Suas contas do Instagram' : 'Ordenadas por seguidores'}
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
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {acc.username?.[0]?.toUpperCase() || 'I'}
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
              platform="instagram"
              accounts={sortedAccounts.map(acc => ({
                id: acc.id, username: acc.username, displayName: acc.display_name, profileImageUrl: acc.profile_image_url,
                followersCount: acc.followers_count, postsCount: acc.posts_count, totalViews: (acc.posts_count || 0) * 1000,
                lastSyncedAt: acc.last_synced_at, isActive: acc.is_active,
              }))}
              isLoading={accountsLoading}
              onSync={handleSyncAccount}
              onDelete={handleDeleteAccount}
              onViewVideos={handleViewPosts}
              isSyncing={syncAccount.isPending}
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
    </div>
  );
}
