import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreatorMetric } from '@/hooks/useCreatorsMetrics';
import { Users, Eye, Heart, MessageSquare, FileText, TrendingUp, Instagram, Youtube, Music2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreatorDetailsDrawerProps {
  creator: CreatorMetric | null;
  open: boolean;
  onClose: () => void;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <Instagram className="h-5 w-5" />;
    case 'youtube':
      return <Youtube className="h-5 w-5" />;
    case 'tiktok':
      return <Music2 className="h-5 w-5" />;
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
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('pt-BR');
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

const MetricCard = ({ title, value, icon, subtitle }: MetricCardProps) => (
  <Card className="bg-card/50 border-border/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-primary">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export const CreatorDetailsDrawer = ({ creator, open, onClose }: CreatorDetailsDrawerProps) => {
  if (!creator) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={creator.profile_image_url || ''} />
              <AvatarFallback className="text-xl">
                {creator.username?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">
                {creator.display_name || creator.username}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                @{creator.username}
                <Badge
                  variant="secondary"
                  className={`${getPlatformColor(creator.platform)} text-white flex items-center gap-1`}
                >
                  {getPlatformIcon(creator.platform)}
                  {creator.platform}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Seguidores"
              value={formatNumber(creator.followers_count)}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Views Totais"
              value={formatNumber(creator.total_views)}
              icon={<Eye className="h-4 w-4" />}
              subtitle="No período coletado"
            />
            <MetricCard
              title="Likes Totais"
              value={formatNumber(creator.total_likes)}
              icon={<Heart className="h-4 w-4" />}
              subtitle="No período coletado"
            />
            <MetricCard
              title="Comentários"
              value={formatNumber(creator.total_comments)}
              icon={<MessageSquare className="h-4 w-4" />}
            />
          </div>

          {/* Métricas Secundárias */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Total de Posts"
              value={creator.total_posts}
              icon={<FileText className="h-4 w-4" />}
              subtitle="Analisados"
            />
            <MetricCard
              title="Taxa de Engajamento"
              value={`${creator.engagement_rate.toFixed(2)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          {/* Informações do Período */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm">Informações da Coleta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última coleta:</span>
                <span>{format(new Date(creator.scraped_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              {creator.period_start && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período início:</span>
                  <span>{format(new Date(creator.period_start), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              )}
              {creator.period_end && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período fim:</span>
                  <span>{format(new Date(creator.period_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placeholder para Gráficos Futuros */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gráficos de evolução em breve</p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
