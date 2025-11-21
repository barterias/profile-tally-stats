import { useEffect, useState } from "react";
import { externalSupabase, RankingEntry } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Heart, MessageCircle, Instagram, Music, Calendar } from "lucide-react";

export default function RankingDaily() {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const data = await externalSupabase.getRankingDaily(100);
      setRanking(data);
    } catch (error) {
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const getRankBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 text-yellow-950";
    if (position === 2) return "bg-gray-400 text-gray-950";
    if (position === 3) return "bg-orange-600 text-orange-950";
    return "bg-muted text-muted-foreground";
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Ranking Diário</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Posts mais virais de hoje - {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary animate-float" />
            <span className="text-2xl font-bold text-glow">{ranking.length}</span>
            <span className="text-muted-foreground">posts</span>
          </div>
        </div>

        {/* Top 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ranking.slice(0, 3).map((entry) => (
            <Card
              key={entry.position}
              className={`glass-card-hover p-6 animate-scale-in relative ${
                entry.position === 1 ? "neon-border" : ""
              }`}
              style={{ animationDelay: `${entry.position * 0.1}s` }}
            >
              <div className="absolute -top-4 -right-4">
                <Badge className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${getRankBadgeColor(entry.position)}`}>
                  #{entry.position}
                </Badge>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt="Post thumbnail"
                      className="h-32 w-32 rounded-lg object-cover border-2 border-primary/50"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-lg bg-primary/10 border-2 border-primary/50 flex items-center justify-center">
                      {entry.platform === "instagram" ? (
                        <Instagram className="h-12 w-12 text-primary" />
                      ) : (
                        <Music className="h-12 w-12 text-primary" />
                      )}
                    </div>
                  )}
                  {entry.position === 1 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        🔥 HOT
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-2 w-full">
                  <Badge variant="outline" className="text-xs">
                    {entry.platform}
                  </Badge>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">Views</span>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {(entry.views / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span className="text-xs">Likes</span>
                      </div>
                      <p className="text-lg font-bold">
                        {(entry.likes / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>

                  <a
                    href={entry.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline block mt-2"
                  >
                    Ver post →
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Rest of Ranking */}
        <div className="space-y-3">
          {ranking.slice(3).map((entry, index) => (
            <Card
              key={entry.position}
              className="glass-card-hover p-4 animate-slide-in-right"
              style={{ animationDelay: `${(index + 3) * 0.02}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex-shrink-0">
                  <Badge className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${getRankBadgeColor(entry.position)}`}>
                    #{entry.position}
                  </Badge>
                </div>

                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt="Post thumbnail"
                      className="h-16 w-16 rounded-lg object-cover border border-primary/30"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      {entry.platform === "instagram" ? (
                        <Instagram className="h-6 w-6 text-primary" />
                      ) : (
                        <Music className="h-6 w-6 text-primary" />
                      )}
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {entry.platform}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.views >= 1000000 
                          ? `${(entry.views / 1000000).toFixed(1)}M`
                          : `${(entry.views / 1000).toFixed(1)}K`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold">
                        {(entry.likes / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.comments.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Comments</p>
                    </div>
                  </div>
                </div>

                {/* Link */}
                <div className="flex-shrink-0">
                  <a
                    href={entry.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver post →
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
