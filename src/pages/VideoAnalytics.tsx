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
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent animate-glow">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  JotaV Cortes
                </h1>
                <p className="text-xs text-muted-foreground">Sistema de Analytics</p>
              </div>
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
                Clipadores
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
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <VideoIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Instagram Analytics</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
              Análise Completa de Vídeos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Acompanhe o desempenho dos seus vídeos do Instagram em tempo real com métricas detalhadas e gráficos interativos
            </p>
          </div>

          {/* Form de rastreamento */}
          <VideoTrackingForm onVideoTracked={handleVideoTracked} />

          {/* Loading State */}
          {isLoadingVideo && (
            <div className="space-y-8 animate-pulse">
              <div className="space-y-4">
                <Skeleton className="w-48 h-6 rounded-lg" />
                <Skeleton className="w-full h-[420px] rounded-2xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="w-64 h-6 rounded-lg" />
                <Skeleton className="w-full h-[400px] rounded-2xl" />
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {!trackedLink && !isLoadingVideo && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <VideoIcon className="w-16 h-16 text-primary" />
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl font-bold text-foreground">
                  Comece sua análise
                </h3>
                <p className="text-muted-foreground">
                  Cole o link de um vídeo do Instagram acima para visualizar métricas detalhadas, histórico de crescimento e análises profundas
                </p>
              </div>
            </div>
          )}

          {/* Vídeo não encontrado */}
          {trackedLink && !isLoadingVideo && !video && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-warning/20 blur-3xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-warning/10 to-destructive/10 border border-warning/30">
                  <VideoIcon className="w-16 h-16 text-warning" />
                </div>
              </div>
              <div className="space-y-3 max-w-md">
                <h3 className="text-2xl font-bold text-foreground">
                  Processando vídeo...
                </h3>
                <p className="text-muted-foreground">
                  O sistema está analisando o vídeo. Aguarde alguns segundos e as métricas aparecerão automaticamente.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setTrackedLink(null)}
                  className="mt-4"
                >
                  Tentar outro link
                </Button>
              </div>
            </div>
          )}

          {/* Conteúdo do vídeo */}
          {video && !isLoadingVideo && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                  Métricas Atuais
                </h3>
                <VideoMetricsCard video={video} />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                  Histórico de Performance
                </h3>
                {isLoadingHistory ? (
                  <Skeleton className="w-full h-[400px] rounded-2xl" />
                ) : (
                  <VideoEvolutionChart history={history || []} />
                )}
              </div>
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
