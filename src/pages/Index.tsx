import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { VideoCard } from "@/components/VideoCard";
import { RankingCard } from "@/components/RankingCard";
import { TrendChart } from "@/components/TrendChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, TrendingUp, Users, Video, Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - será substituído por dados reais da API
  const metrics = [
    { title: "Total de Views", value: "2.4M", change: 12.5, icon: Eye, trend: "up" as const },
    { title: "Vídeos Ativos", value: "156", change: 8, icon: Video, trend: "up" as const },
    { title: "Criadores", value: "42", change: -2, icon: Users, trend: "down" as const },
    { title: "Trending Hoje", value: "23", change: 15, icon: TrendingUp, trend: "up" as const },
  ];

  const trendData = [
    { name: "Seg", value: 320000 },
    { name: "Ter", value: 450000 },
    { name: "Qua", value: 380000 },
    { name: "Qui", value: 520000 },
    { name: "Sex", value: 670000 },
    { name: "Sáb", value: 890000 },
    { name: "Dom", value: 750000 },
  ];

  const topVideos = [
    {
      thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
      title: "Tutorial de Dança Viral",
      views: 1200000,
      likes: 89000,
      shares: 12000,
      hashtag: "#dancachallenge",
      trending: true,
    },
    {
      thumbnail: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400",
      title: "Receita Rápida 5 Min",
      views: 890000,
      likes: 67000,
      shares: 8900,
      hashtag: "#receitas",
    },
    {
      thumbnail: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400",
      title: "Treino em Casa",
      views: 750000,
      likes: 54000,
      shares: 7200,
      hashtag: "#fitness",
      trending: true,
    },
    {
      thumbnail: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?w=400",
      title: "Maquiagem Tutorial",
      views: 680000,
      likes: 48000,
      shares: 6100,
      hashtag: "#makeup",
    },
  ];

  const topCreators = [
    { rank: 1, name: "@maria_danca", value: "3.2M views", change: 5 },
    { rank: 2, name: "@chef_rapido", value: "2.8M views", change: 12 },
    { rank: 3, name: "@fit_coach", value: "2.1M views", change: -3 },
    { rank: 4, name: "@makeup_pro", value: "1.9M views", change: 8 },
    { rank: 5, name: "@tech_tips", value: "1.5M views", change: 15 },
  ];

  const dailyTop = [
    { rank: 1, name: "Tutorial Viral", value: "450K views", change: 120 },
    { rank: 2, name: "Desafio 24h", value: "380K views", change: 95 },
    { rank: 3, name: "Reação Épica", value: "320K views", change: 78 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Social Analytics
              </h1>
              <p className="text-sm text-muted-foreground">Dashboard de Performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="today">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="all">Todo Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics Overview */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Visão Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </section>

        {/* Trend Chart */}
        <section>
          <TrendChart title="Tendência de Views - Últimos 7 Dias" data={trendData} />
        </section>

        {/* Rankings */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingCard title="🏆 Top Criadores" items={topCreators} />
          <RankingCard title="🔥 Mais Views Hoje" items={dailyTop} />
        </section>

        {/* Videos Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Vídeos em Destaque</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por hashtag..." 
                  className="pl-9 w-[240px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topVideos.map((video, index) => (
              <VideoCard key={index} {...video} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
