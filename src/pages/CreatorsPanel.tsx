import { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreatorsMetricsTable } from '@/components/Creators/CreatorsMetricsTable';
import { CreatorDetailsDrawer } from '@/components/Creators/CreatorDetailsDrawer';
import { useCreatorsMetrics, CreatorMetric } from '@/hooks/useCreatorsMetrics';
import { CalendarIcon, Users, Eye, Heart, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CreatorsPanel = () => {
  const [platform, setPlatform] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedCreator, setSelectedCreator] = useState<CreatorMetric | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: metrics = [], isLoading, refetch } = useCreatorsMetrics({
    platform: platform === 'all' ? undefined : platform,
    startDate,
    endDate,
  });

  const handleRowClick = (creator: CreatorMetric) => {
    setSelectedCreator(creator);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCreator(null);
  };

  // Calcular totais
  const totals = metrics.reduce(
    (acc, metric) => ({
      followers: acc.followers + metric.followers_count,
      views: acc.views + metric.total_views,
      likes: acc.likes + metric.total_likes,
      engagement: acc.engagement + metric.engagement_rate,
    }),
    { followers: 0, views: 0, likes: 0, engagement: 0 }
  );

  const avgEngagement = metrics.length > 0 ? totals.engagement / metrics.length : 0;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('pt-BR');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Creators Panel</h1>
            <p className="text-muted-foreground">
              Métricas coletadas pelo Scraper Creators
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seguidores Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totals.followers)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Views Totais</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totals.views)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engajamento Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgEngagement.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtre os creators por plataforma e período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Filtro de Plataforma */}
              <div className="w-48">
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Plataformas</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Data Início */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-48 justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Filtro de Data Fim */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-48 justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Limpar Filtros */}
              {(startDate || endDate || platform !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setPlatform('all');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Creators */}
        <Card>
          <CardHeader>
            <CardTitle>Creators Analisados</CardTitle>
            <CardDescription>
              Clique em uma linha para ver os detalhes do creator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatorsMetricsTable
              data={metrics}
              isLoading={isLoading}
              onRowClick={handleRowClick}
            />
          </CardContent>
        </Card>

        {/* Drawer de Detalhes */}
        <CreatorDetailsDrawer
          creator={selectedCreator}
          open={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </MainLayout>
  );
};

export default CreatorsPanel;
