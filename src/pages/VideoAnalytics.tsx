import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Video as VideoIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VideoTrackingForm } from "@/components/VideoAnalytics/VideoTrackingForm";
import { VideoMetricsCard } from "@/components/VideoAnalytics/VideoMetricsCard";
import { VideoEvolutionChart } from "@/components/VideoAnalytics/VideoEvolutionChart";
import { externalSupabase } from "@/lib/externalSupabase";

function VideoAnalyticsContent() {
  const { signOut } = useAuth();
  const [trackedLink, setTrackedLink] = useState<string | null>(null);

  const { data: video, isLoading: isLoadingVideo, refetch: refetchVideo } = useQuery({
    queryKey: ["video-analytics", trackedLink],
    queryFn: async () => {
      if (!trackedLink) return null;
      return externalSupabase.getVideoByLink(trackedLink);
    },
    enabled: !!trackedLink,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["video-history", video?.id],
    queryFn: async () => {
      if (!video?.id) return [];
      return externalSupabase.getVideoHistory(video.id);
    },
    enabled: !!video?.id,
  });

  const handleVideoTracked = (link: string) => {
    setTrackedLink(link);
    setTimeout(() => {
      refetchVideo();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
                Adicionar Vídeo
              </NavLink>
              <NavLink
                to="/video-analytics"
                className="text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-primary font-medium"
              >
                Análise de Vídeos
              </NavLink>
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
        <div className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Análise de Vídeos do Instagram
            </h2>
            <p className="text-muted-foreground">
              Rastreie e analise a performance dos seus vídeos em tempo real
            </p>
          </div>

          {/* Form de rastreamento */}
          <VideoTrackingForm onVideoTracked={handleVideoTracked} />

          {/* Loading State */}
          {isLoadingVideo && (
            <div className="space-y-6">
              <Skeleton className="h-96 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
          )}

          {/* Estado vazio */}
          {!trackedLink && !isLoadingVideo && (
            <div className="text-center py-20">
              <VideoIcon className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum vídeo rastreado ainda
              </h3>
              <p className="text-muted-foreground">
                Cole um link do Instagram acima para começar a análise
              </p>
            </div>
          )}

          {/* Vídeo não encontrado */}
          {trackedLink && !isLoadingVideo && !video && (
            <div className="text-center py-20">
              <VideoIcon className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Vídeo não encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Este vídeo ainda não foi processado ou o link está incorreto
              </p>
              <Button
                variant="outline"
                onClick={() => setTrackedLink(null)}
              >
                Tentar outro link
              </Button>
            </div>
          )}

          {/* Conteúdo do vídeo */}
          {video && !isLoadingVideo && (
            <div className="space-y-6">
              {/* Card de métricas */}
              <VideoMetricsCard video={video} />

              {/* Gráfico de evolução */}
              {isLoadingHistory ? (
                <Skeleton className="h-80 w-full rounded-lg" />
              ) : (
                <VideoEvolutionChart history={history || []} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoAnalytics() {
  return (
    <ProtectedRoute>
      <VideoAnalyticsContent />
    </ProtectedRoute>
  );
}
