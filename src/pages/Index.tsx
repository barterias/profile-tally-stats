import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { VideoCard } from "@/components/VideoCard";
import { RankingCard } from "@/components/RankingCard";
import { TrendChart } from "@/components/TrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Eye, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function IndexContent() {
  const [selectedHashtag, setSelectedHashtag] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const { signOut, isAdmin } = useAuth();

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

  const totalViews = videos?.reduce((acc, v) => acc + v.views, 0) || 0;
  const totalVideos = videos?.length || 0;
  const totalCreators = creators?.length || 0;
  const trendingVideos = videos?.filter(v => v.views > 10000).length || 0;

  const topVideosToday = videos?.slice(0, 5) || [];
  const topCreatorsRanking = creators?.slice(0, 10) || [];

  const trendData = [
    { name: "Seg", value: 0 },
    { name: "Ter", value: 0 },
    { name: "Qua", value: 0 },
    { name: "Qui", value: 0 },
    { name: "Sex", value: 0 },
    { name: "Sáb", value: 0 },
    { name: "Dom", value: totalViews },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <header className="border-b border-white/10 bg-card-dark/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Trophy className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold">Campeonato de Cortes</h1>
            </div>
            <div className="flex gap-2">
              <NavLink to="/">Rankings</NavLink>
              {isAdmin && <NavLink to="/admin">Gerenciar Vídeos</NavLink>}
              {isAdmin && <NavLink to="/creators">Criadores</NavLink>}
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Views" value={totalViews.toLocaleString()} icon={<Eye className="w-5 h-5" />} trend={`${totalVideos} vídeos`} />
            <MetricCard title="Vídeos Trending" value={trendingVideos.toString()} icon={<TrendingUp className="w-5 h-5" />} trend=">10K views" />
            <MetricCard title="Total de Vídeos" value={totalVideos.toString()} icon={<Trophy className="w-5 h-5" />} trend="no campeonato" />
            <MetricCard title="Criadores" value={totalCreators.toString()} icon={<Users className="w-5 h-5" />} trend="competindo" />
          </div>
        </div>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground">Tendência de Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={trendData} />
                </CardContent>
              </Card>

              <Card className="bg-card-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground">Top Vídeos Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {topVideosToday.map((video) => (
                      <VideoCard 
                        key={video.id}
                        id={video.id}
                        thumbnail={video.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400"}
                        title={video.title}
                        views={video.views}
                        likes={video.likes}
                        shares={video.shares}
                        hashtag={video.hashtags?.[0] || ""}
                        trending={video.views > 50000}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card-dark border-white/10">
                <CardHeader>
                  <CardTitle className="text-foreground">Top Criadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCreatorsRanking.map((creator, index) => (
                      <RankingCard key={creator.id} rank={index + 1} name={creator.name} views={creator.total_views.toLocaleString()} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
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
