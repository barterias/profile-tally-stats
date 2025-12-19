import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
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
}

interface PlatformAccountsTableProps {
  platform: 'instagram' | 'youtube' | 'tiktok';
  accounts: AccountData[];
  isLoading: boolean;
  onSync: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  isSyncing?: boolean;
}

const platformUrls = {
  instagram: (username: string) => `https://instagram.com/${username}`,
  youtube: (username: string) => `https://youtube.com/@${username}`,
  tiktok: (username: string) => `https://tiktok.com/@${username}`,
};

const platformLabels = {
  instagram: { followers: 'Seguidores', posts: 'Posts' },
  youtube: { followers: 'Inscritos', posts: 'Vídeos' },
  tiktok: { followers: 'Seguidores', posts: 'Vídeos' },
};

export function PlatformAccountsTable({
  platform,
  accounts,
  isLoading,
  onSync,
  onDelete,
  isSyncing,
}: PlatformAccountsTableProps) {
  const formatNumber = (num: number | bigint | null | undefined) => {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Conta</TableHead>
          <TableHead className="text-right">{labels.followers}</TableHead>
          <TableHead className="text-right">{labels.posts}</TableHead>
          {platform === 'youtube' && <TableHead className="text-right">Views Totais</TableHead>}
          {platform === 'tiktok' && <TableHead className="text-right">Curtidas</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Última Sync</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
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
              <Badge variant={account.isActive ? 'default' : 'secondary'}>
                {account.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
