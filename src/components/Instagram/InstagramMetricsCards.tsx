import { Users, Heart, MessageCircle, Eye, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface InstagramMetricsCardsProps {
  totalFollowers: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  accountsCount: number;
  isLoading: boolean;
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

export function InstagramMetricsCards({
  totalFollowers,
  totalLikes,
  totalComments,
  totalViews,
  accountsCount,
  isLoading,
}: InstagramMetricsCardsProps) {
  const cards = [
    {
      title: 'Contas Monitoradas',
      value: accountsCount,
      icon: UserPlus,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total de Seguidores',
      value: totalFollowers,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total de Curtidas',
      value: totalLikes,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Total de Comentários',
      value: totalComments,
      icon: MessageCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total de Views',
      value: totalViews,
      icon: Eye,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <p className="text-xl font-bold">{formatNumber(card.value)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
