import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatorMetric } from '@/hooks/useCreatorsMetrics';
import { Instagram, Youtube, Music2, Eye, Heart, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreatorsMetricsTableProps {
  data: CreatorMetric[];
  isLoading: boolean;
  onRowClick: (creator: CreatorMetric) => void;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <Instagram className="h-4 w-4" />;
    case 'youtube':
      return <Youtube className="h-4 w-4" />;
    case 'tiktok':
      return <Music2 className="h-4 w-4" />;
    default:
      return null;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'bg-gradient-to-r from-purple-500 to-pink-500';
    case 'youtube':
      return 'bg-red-500';
    case 'tiktok':
      return 'bg-black';
    default:
      return 'bg-muted';
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const CreatorsMetricsTable = ({
  data,
  isLoading,
  onRowClick,
}: CreatorsMetricsTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma métrica de creator encontrada. Execute o scraper para coletar dados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Creator</TableHead>
            <TableHead>Plataforma</TableHead>
            <TableHead className="text-right">Seguidores</TableHead>
            <TableHead className="text-right">Views Totais</TableHead>
            <TableHead className="text-right">Likes Totais</TableHead>
            <TableHead className="text-right">Engajamento</TableHead>
            <TableHead className="text-right">Última Coleta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((creator) => (
            <TableRow
              key={creator.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onRowClick(creator)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={creator.profile_image_url || ''} />
                    <AvatarFallback>
                      {creator.username?.charAt(0).toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{creator.display_name || creator.username}</p>
                    <p className="text-sm text-muted-foreground">@{creator.username}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`${getPlatformColor(creator.platform)} text-white flex items-center gap-1 w-fit`}
                >
                  {getPlatformIcon(creator.platform)}
                  {creator.platform}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {formatNumber(creator.followers_count)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  {formatNumber(creator.total_views)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  {formatNumber(creator.total_likes)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-primary font-medium">
                  {creator.engagement_rate.toFixed(2)}%
                </span>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {format(new Date(creator.scraped_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
