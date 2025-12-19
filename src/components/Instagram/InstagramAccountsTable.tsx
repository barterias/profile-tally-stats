import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Instagram, RefreshCw, Trash2, ExternalLink, MoreHorizontal, Video } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InstagramAccount } from '@/lib/api/instagram';

interface InstagramAccountsTableProps {
  accounts: InstagramAccount[];
  isLoading: boolean;
  onSync: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onViewPosts?: (accountId: string, username: string) => void;
  isSyncing?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function InstagramAccountsTable({
  accounts,
  isLoading,
  onSync,
  onDelete,
  onViewPosts,
  isSyncing,
}: InstagramAccountsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma conta do Instagram adicionada</p>
        <p className="text-sm">Adicione uma conta para começar a monitorar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Conta</TableHead>
          <TableHead className="text-right">Seguidores</TableHead>
          <TableHead className="text-right">Seguindo</TableHead>
          <TableHead className="text-right">Posts</TableHead>
          <TableHead>Última Atualização</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.profile_image_url || undefined} alt={account.username} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <Instagram className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">@{account.username}</span>
                    <Badge variant="secondary" className="text-xs">
                      <Instagram className="h-3 w-3 mr-1" />
                      Instagram
                    </Badge>
                  </div>
                  {account.display_name && (
                    <p className="text-sm text-muted-foreground">{account.display_name}</p>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(account.followers_count)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(account.following_count)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(account.posts_count)}
            </TableCell>
            <TableCell>
              {account.last_synced_at ? (
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(account.last_synced_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Nunca</span>
              )}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewPosts && (
                    <DropdownMenuItem onClick={() => onViewPosts(account.id, account.username)}>
                      <Video className="h-4 w-4 mr-2" />
                      Ver Posts
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onSync(account.id)} disabled={isSyncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Atualizar Métricas
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={account.profile_url} target="_blank" rel="noopener noreferrer">
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
