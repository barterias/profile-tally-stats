import { 
  Music, 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook, 
  Linkedin,
  MoreVertical,
  ExternalLink,
  Unlink,
  RefreshCw
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SocialAccountWithMetrics, SocialPlatform } from '@/types/socialMedia';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SocialAccountsTableProps {
  accounts: SocialAccountWithMetrics[];
  isLoading: boolean;
  onDisconnect: (accountId: string) => void;
  onViewDetails: (accountId: string) => void;
}

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  tiktok: Music,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
};

const platformColors: Record<SocialPlatform, string> = {
  tiktok: 'bg-foreground text-background',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-foreground',
  youtube: 'bg-destructive text-destructive-foreground',
  twitter: 'bg-foreground text-background',
  facebook: 'bg-blue-600 text-foreground',
  linkedin: 'bg-blue-700 text-foreground',
};

const formatNumber = (num: number | undefined): string => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export function SocialAccountsTable({ 
  accounts, 
  isLoading, 
  onDisconnect, 
  onViewDetails 
}: SocialAccountsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma conta conectada ainda.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte suas redes sociais para começar a monitorar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[200px]">Plataforma</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead className="text-right">Seguidores</TableHead>
            <TableHead className="text-right">Curtidas</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Comentários</TableHead>
            <TableHead className="text-right">Engajamento</TableHead>
            <TableHead className="text-center">Última Atualização</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const PlatformIcon = platformIcons[account.platform];
            const metrics = account.metrics;
            
            return (
              <TableRow 
                key={account.id}
                className="hover:bg-muted/20 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Badge className={platformColors[account.platform]}>
                      <PlatformIcon className="h-3 w-3 mr-1" />
                      {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.profile_image_url} />
                      <AvatarFallback>
                        {account.account_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{account.account_name}</p>
                      <p className="text-xs text-muted-foreground">{account.account_username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {formatNumber(metrics?.followers)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(metrics?.likes)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(metrics?.views)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(metrics?.comments)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono">
                    {metrics?.engagement_rate?.toFixed(1) || '0.0'}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {account.last_synced_at 
                    ? formatDistanceToNow(new Date(account.last_synced_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })
                    : 'Nunca'
                  }
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(account.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDisconnect(account.id)}
                        className="text-destructive"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Desconectar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
