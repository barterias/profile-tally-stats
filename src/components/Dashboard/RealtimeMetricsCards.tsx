import { useRealtimeProfileMetrics } from '@/hooks/useRealtimeProfileMetrics';
import { SyncButton } from '@/components/SyncButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye, Heart, FileVideo, Instagram, Youtube, Music2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RealtimeMetricsCardsProps {
  showSyncButton?: boolean;
  showPlatformBreakdown?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('pt-BR');
}

export function RealtimeMetricsCards({ showSyncButton = true, showPlatformBreakdown = true }: RealtimeMetricsCardsProps) {
  const { aggregated, isLoading, lastUpdate } = useRealtimeProfileMetrics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const mainMetrics = [
    {
      title: 'Seguidores',
      value: aggregated.totalFollowers,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Visualizações',
      value: aggregated.totalViews,
      icon: Eye,
      color: 'text-green-500',
    },
    {
      title: 'Curtidas',
      value: aggregated.totalLikes,
      icon: Heart,
      color: 'text-red-500',
    },
    {
      title: 'Posts/Vídeos',
      value: aggregated.totalPosts,
      icon: FileVideo,
      color: 'text-purple-500',
    },
  ];

  const platformIcons = {
    instagram: Instagram,
    tiktok: Music2,
    youtube: Youtube,
  };

  const platformColors = {
    instagram: 'bg-gradient-to-br from-pink-500 to-orange-400',
    tiktok: 'bg-gradient-to-br from-black to-pink-500',
    youtube: 'bg-gradient-to-br from-red-600 to-red-400',
  };

  return (
    <div className="space-y-4">
      {/* Header with sync button and last update */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lastUpdate ? (
            <span>
              Última atualização:{' '}
              {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
            </span>
          ) : (
            <span>Aguardando dados...</span>
          )}
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Realtime ativo" />
        </div>
        {showSyncButton && <SyncButton />}
      </div>

      {/* Main metrics cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {mainMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(metric.value)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform breakdown */}
      {showPlatformBreakdown && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {(Object.keys(aggregated.byPlatform) as Array<keyof typeof aggregated.byPlatform>).map((platform) => {
            const data = aggregated.byPlatform[platform];
            const Icon = platformIcons[platform];
            const colorClass = platformColors[platform];

            return (
              <Card key={platform} className="relative overflow-hidden">
                <div className={`absolute inset-0 opacity-5 ${colorClass}`} />
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm font-medium capitalize">
                    {platform} ({data.accounts})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Seguidores:</span>
                      <span className="ml-1 font-semibold">{formatNumber(data.followers)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Views:</span>
                      <span className="ml-1 font-semibold">{formatNumber(data.views)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Curtidas:</span>
                      <span className="ml-1 font-semibold">{formatNumber(data.likes)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Posts:</span>
                      <span className="ml-1 font-semibold">{formatNumber(data.posts)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
