import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, RefreshCw, Trash2, ExternalLink, Video, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountData {
  id: string;
  username: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
  followersCount?: number | null;
  postsCount?: number | null;
  totalViews?: number | bigint | null;
  likesCount?: number | bigint | null;
  lastSyncedAt?: string | null;
  isActive?: boolean | null;
  approvalStatus?: string | null;
}

interface PlatformAccountsTableProps {
  platform: 'instagram' | 'youtube' | 'tiktok';
  accounts: AccountData[];
  isLoading: boolean;
  onSync: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onViewVideos?: (accountId: string, username: string) => void;
  onApprove?: (accountId: string) => void;
  onReject?: (accountId: string) => void;
  isSyncing?: boolean;
  showApprovalActions?: boolean;
}

const platformUrls = {
  instagram: (username: string) => `https://instagram.com/${username}`,
  youtube: (username: string) => `https://youtube.com/@${username}`,
  tiktok: (username: string) => `https://tiktok.com/@${username}`,
};

const platformLabels = {
  instagram: { followers: 'Seguidores', posts: 'Posts', videos: 'Ver Posts' },
  youtube: { followers: 'Inscritos', posts: 'Vídeos', videos: 'Ver Vídeos' },
  tiktok: { followers: 'Seguidores', posts: 'Vídeos', videos: 'Ver Vídeos' },
};

export function PlatformAccountsTable({
  platform,
  accounts,
  isLoading,
  onSync,
  onDelete,
  onViewVideos,
  onApprove,
  onReject,
  isSyncing,
  showApprovalActions = false,
}: PlatformAccountsTableProps) {
  const formatNumber = (num: number | bigint | null | undefined) => {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Sort accounts by total views (highest first)
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aViews = Number(a.totalViews || 0);
    const bViews = Number(b.totalViews || 0);
    return bViews - aViews;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma conta adicionada ainda
      </div>
    );
  }

  const labels = platformLabels[platform];

  const getApprovalBadge = (status: string | null | undefined) => {
    if (!status || status === 'approved') {
      return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Aprovada</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Conta</TableHead>
          <TableHead className="text-right">{labels.followers}</TableHead>
          <TableHead className="text-right">{labels.posts}</TableHead>
          {platform === 'youtube' && <TableHead className="text-right">Views Totais</TableHead>}
          {platform === 'tiktok' && <TableHead className="text-right">Curtidas</TableHead>}
          <TableHead>Aprovação</TableHead>
          <TableHead>Última Sync</TableHead>
          <TableHead className="w-32"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAccounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {account.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{account.displayName || account.username}</div>
                  <div className="text-sm text-muted-foreground">@{account.username}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(account.followersCount)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(account.postsCount)}
            </TableCell>
            {platform === 'youtube' && (
              <TableCell className="text-right">
                {formatNumber(account.totalViews)}
              </TableCell>
            )}
            {platform === 'tiktok' && (
              <TableCell className="text-right">
                {formatNumber(account.likesCount)}
              </TableCell>
            )}
            <TableCell>
              {getApprovalBadge(account.approvalStatus)}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {account.lastSyncedAt
                ? formatDistanceToNow(new Date(account.lastSyncedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : 'Nunca'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {/* Approval actions for pending accounts */}
                {showApprovalActions && account.approvalStatus === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onApprove?.(account.id)}
                      title="Aprovar"
                      className="text-success hover:text-success hover:bg-success/10"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReject?.(account.id)}
                      title="Rejeitar"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {onViewVideos && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewVideos(account.id, account.username)}
                    title={labels.videos}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background">
                    <DropdownMenuItem
                      onClick={() => onSync(account.id)}
                      disabled={isSyncing}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={platformUrls[platform](account.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(account.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
