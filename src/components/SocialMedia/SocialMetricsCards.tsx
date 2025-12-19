import { 
  Users, 
  Eye, 
  Heart, 
  MessageCircle, 
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { MetricsSummary } from '@/types/socialMedia';
import { cn } from '@/lib/utils';

interface SocialMetricsCardsProps {
  summary: MetricsSummary | undefined;
  isLoading: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export function SocialMetricsCards({ summary, isLoading }: SocialMetricsCardsProps) {
  const cards = [
    {
      title: 'Seguidores Totais',
      value: summary?.total_followers || 0,
      icon: Users,
      gradient: 'from-primary to-accent',
      change: summary?.growth_percentage || 0,
    },
    {
      title: 'Views (7 dias)',
      value: summary?.total_views_7d || 0,
      icon: Eye,
      gradient: 'from-chart-2 to-chart-3',
    },
    {
      title: 'Curtidas (7 dias)',
      value: summary?.total_likes_7d || 0,
      icon: Heart,
      gradient: 'from-destructive to-warning',
    },
    {
      title: 'Comentários (7 dias)',
      value: summary?.total_comments_7d || 0,
      icon: MessageCircle,
      gradient: 'from-chart-4 to-chart-2',
    },
    {
      title: 'Taxa de Engajamento',
      value: summary?.avg_engagement_rate || 0,
      icon: TrendingUp,
      gradient: 'from-chart-5 to-primary',
      suffix: '%',
      isPercentage: true,
    },
    {
      title: 'Contas Conectadas',
      value: summary?.accounts_count || 0,
      icon: BarChart3,
      gradient: 'from-accent to-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card 
          key={card.title} 
          className={cn(
            "glass-card glass-card-hover overflow-hidden relative group",
            "animate-slide-up"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={cn(
            "absolute inset-0 opacity-10 bg-gradient-to-br",
            card.gradient
          )} />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                card.gradient
              )}>
                <card.icon className="h-4 w-4 text-background" />
              </div>
              {card.change !== undefined && card.change > 0 && (
                <span className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{card.change}%
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="h-8 bg-muted/50 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {card.isPercentage 
                  ? card.value.toFixed(1) 
                  : formatNumber(card.value)}
                {card.suffix}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {card.title}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
