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
  useYouTubeAccounts,
  useAllYouTubeAccounts,
  useAddYouTubeAccount,
  useSyncYouTubeAccount,
  useDeleteYouTubeAccount,
} from '@/hooks/useYouTubeAccounts';
import { useYouTubeVideos } from '@/hooks/useYouTubeVideos';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function YouTubeTab() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const { isClipper, isAdmin, isClient } = useUserRole();

  const { data: accounts = [], isLoading: accountsLoading } = isAdmin || isClient
    ? useAllYouTubeAccounts()
    : useYouTubeAccounts();

  const { data: videos = [], isLoading: videosLoading } = useYouTubeVideos(selectedAccount?.id || '');

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

  const handleViewVideos = (accountId: string, username: string) => {
    setSelectedAccount({ id: accountId, username });
    setVideosModalOpen(true);
  };

  const handleSyncAll = () => {
    accounts.forEach((account) => {
      syncAccount.mutate(account.id);
    });
  };

  const visibleAccounts = isClipper 
    ? accounts 
    : accounts.filter((acc: any) => acc.approval_status === 'approved' || !acc.approval_status);

  const sortedAccounts = [...visibleAccounts].sort((a, b) => Number(b.total_views || 0) - Number(a.total_views || 0));
  const totalSubscribers = visibleAccounts.reduce((sum, acc) => sum + (acc.subscribers_count || 0), 0);
  const totalViews = visibleAccounts.reduce((sum, acc) => sum + Number(acc.total_views || 0), 0);
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
            Atualizar Todos
          </Button>
        )}
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Canal
        </Button>
      </div>

      {isClipper && accounts.length > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Seus canais precisam ser aprovados por um administrador antes de aparecerem nos relatórios.
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
          <MetricCardGlow title="Inscritos" value={formatNumber(totalSubscribers)} icon={Users} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Visualizações Totais" value={formatNumber(totalViews)} icon={Eye} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Vídeos" value={formatNumber(totalVideos)} icon={Video} trend={{ value: 0, isPositive: true }} />
          <MetricCardGlow title="Canais" value={visibleAccounts.length.toString()} icon={ThumbsUp} trend={{ value: 0, isPositive: true }} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Canais Monitorados</CardTitle>
          <CardDescription>
            {isClipper ? 'Seus canais do YouTube' : 'Ordenados por visualizações totais'}
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
                      <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
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
              accounts={sortedAccounts.map(acc => ({
                id: acc.id, username: acc.username, displayName: acc.display_name, profileImageUrl: acc.profile_image_url,
                followersCount: acc.subscribers_count, postsCount: acc.videos_count, totalViews: acc.total_views,
                lastSyncedAt: acc.last_synced_at, isActive: acc.is_active,
              }))}
              isLoading={accountsLoading}
              onSync={handleSyncAccount}
              onDelete={handleDeleteAccount}
              onViewVideos={handleViewVideos}
              isSyncing={syncAccount.isPending}
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
