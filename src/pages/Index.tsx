import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { VideoCard } from "@/components/VideoCard";
import { RankingCard } from "@/components/RankingCard";
import { TrendChart } from "@/components/TrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Eye, Users, Video, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function IndexContent() {
  const { signOut, isAdmin } = useAuth();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(`*, creators (name, username, platform, avatar_url)`)
        .order("views", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: creators } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("total_views", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const totalViews = videos?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;
  const totalVideos = videos?.length || 0;
  const totalCreators = creators?.length || 0;

  const topVideosToday = videos?.slice(0, 6) || [];

  // Distribute views across the week for visualization
  const trendData = [
    { name: "Seg", value: Math.floor(totalViews * 0.12) },
    { name: "Ter", value: Math.floor(totalViews * 0.10) },
    { name: "Qua", value: Math.floor(totalViews * 0.15) },
    { name: "Qui", value: Math.floor(totalViews * 0.14) },
    { name: "Sex", value: Math.floor(totalViews * 0.16) },
    { name: "Sáb", value: Math.floor(totalViews * 0.18) },
    { name: "Dom", value: Math.floor(totalViews * 0.15) },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Analytics Hub
              </h1>
            </div>
            <nav className="flex items-center gap-6">
              <NavLink
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-primary font-medium"
              >
                Dashboard
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink
                    to="/creators"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    activeClassName="text-primary font-medium"
                  >
                    Creators
                  </NavLink>
                  <NavLink
                    to="/admin"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    activeClassName="text-primary font-medium"
                  >
                    Admin
                  </NavLink>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total de Vídeos"
            value={totalVideos}
            icon={<Video className="w-6 h-6" />}
            trend={`${totalVideos} vídeos cadastrados`}
          />
          <MetricCard
            title="Views Totais"
            value={formatNumber(totalViews)}
            icon={<Eye className="w-6 h-6" />}
            trend="soma de todas as views"
          />
          <MetricCard
            title="Creators Ativos"
            value={totalCreators}
            icon={<Users className="w-6 h-6" />}
            trend={`${totalCreators} creators cadastrados`}
          />
          <MetricCard
            title="Média de Views"
            value={totalVideos > 0 ? formatNumber(Math.floor(totalViews / totalVideos)) : 0}
            icon={<TrendingUp className="w-6 h-6" />}
            trend="por vídeo"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Videos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trend Chart */}
            <TrendChart title="Tendência de Views" data={trendData} />

            {/* Top Videos */}
            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Top Vídeos</CardTitle>
              </CardHeader>
              <CardContent>
                {topVideosToday.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum vídeo cadastrado ainda.
                    </p>
                    {isAdmin && (
                      <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/admin'}>
                        Adicionar Vídeos
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {topVideosToday.map((video) => (
                      <VideoCard 
                        key={video.id}
                        thumbnail={video.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400"}
                        title={video.title}
                        views={video.views || 0}
                        likes={video.likes || 0}
                        shares={video.shares || 0}
                        hashtag={video.hashtags?.[0] || "#viral"}
                        trending={(video.views || 0) > 50000}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Top Creators */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Top Creators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creators && creators.length > 0 ? (
                  creators.map((creator, index) => (
                    <RankingCard
                      key={creator.id}
                      rank={index + 1}
                      name={creator.name}
                      views={formatNumber(creator.total_views || 0)}
                      avatar={creator.avatar_url}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">
                      Nenhum creator cadastrado ainda.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
