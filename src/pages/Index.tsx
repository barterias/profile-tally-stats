import { useQuery } from "@tanstack/react-query";
import { Trophy, Eye, Users, Video as VideoIcon, LogOut, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { VideoCard } from "@/components/VideoCard";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { externalSupabase } from "@/lib/externalSupabase";
import { RankingTable } from "@/components/RankingTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function IndexContent() {
  const { signOut } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["total-stats"],
    queryFn: () => externalSupabase.getTotalStats(),
  });

  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ["all-videos"],
    queryFn: () => externalSupabase.getAllVideos(),
  });

  const { data: dailyRanking, isLoading: isLoadingDaily } = useQuery({
    queryKey: ["daily-ranking"],
    queryFn: () => externalSupabase.getDailyRanking(),
  });

  const { data: monthlyRanking, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["monthly-ranking"],
    queryFn: () => externalSupabase.getMonthlyRanking(),
  });

  const { data: overallRanking, isLoading: isLoadingOverall } = useQuery({
    queryKey: ["overall-ranking"],
    queryFn: () => externalSupabase.getOverallRanking(),
  });

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent animate-float">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-glow">
                  JotaV Cortes
                </h1>
                <p className="text-xs text-muted-foreground">Campeonatos de Cortes</p>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <NavLink
                to="/"
                className="text-muted-foreground hover:text-primary transition-colors"
                activeClassName="text-primary font-medium"
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/campaigns"
                className="text-muted-foreground hover:text-primary transition-colors"
                activeClassName="text-primary font-medium"
              >
                Campeonatos
              </NavLink>
              <NavLink
                to="/video-analytics"
                className="text-muted-foreground hover:text-primary transition-colors"
                activeClassName="text-primary font-medium"
              >
                Vídeos
              </NavLink>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
            <MetricCard
              title="Total de Views"
              value={(stats?.totalViews || 0).toLocaleString()}
              icon={<Eye className="w-6 h-6 text-primary" />}
              trend="De todos os tempos"
            />
            <MetricCard
              title="Total de Vídeos"
              value={stats?.totalVideos || 0}
              icon={<VideoIcon className="w-6 h-6 text-accent" />}
              trend="Vídeos rastreados"
            />
            <MetricCard
              title="Clipadores Ativos"
              value={stats?.totalCreators || 0}
              icon={<Users className="w-6 h-6 text-success" />}
              trend="Total de clipadores"
            />
          </div>

          {/* Rankings Section */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 neon-border">
                <TrendingUp className="w-6 h-6 text-primary animate-pulse-glow" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-glow">
                  Rankings de Clipadores
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Acompanhe os melhores performers por período
                </p>
              </div>
            </div>

            <Tabs defaultValue="overall" className="w-full">
              <TabsList className="grid w-full grid-cols-3 glass-card">
                <TabsTrigger value="daily" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  Hoje
                </TabsTrigger>
                <TabsTrigger value="monthly" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                  Este Mês
                </TabsTrigger>
                <TabsTrigger value="overall" className="data-[state=active]:bg-success/20 data-[state=active]:text-success">
                  Geral
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="mt-6">
                {isLoadingDaily ? (
                  <div className="h-96 bg-card rounded-lg animate-pulse" />
                ) : (
                  <RankingTable
                    title="Ranking Diário"
                    data={dailyRanking || []}
                    period="daily"
                  />
                )}
              </TabsContent>

              <TabsContent value="monthly" className="mt-6">
                {isLoadingMonthly ? (
                  <div className="h-96 bg-card rounded-lg animate-pulse" />
                ) : (
                  <RankingTable
                    title="Ranking Mensal"
                    data={monthlyRanking || []}
                    period="monthly"
                  />
                )}
              </TabsContent>

              <TabsContent value="overall" className="mt-6">
                {isLoadingOverall ? (
                  <div className="h-96 bg-card rounded-lg animate-pulse" />
                ) : (
                  <RankingTable
                    title="Ranking Geral"
                    data={overallRanking || []}
                    period="overall"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Video Grid */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Vídeos em Destaque</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Os vídeos com melhor performance
                </p>
              </div>
            </div>

            {isLoadingVideos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-96 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos?.slice(0, 8).map((video, index) => (
                  <div
                    key={video.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <VideoCard
                      thumbnail={video.post_image || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"}
                      title={video.link}
                      views={video.views || 0}
                      likes={video.likes || 0}
                      shares={0}
                      hashtag={video.platform}
                      trending={video.views > 5000}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <ProtectedRoute>
      <IndexContent />
    </ProtectedRoute>
  );
}
