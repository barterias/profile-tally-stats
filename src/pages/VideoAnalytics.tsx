import { Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialVideosList } from "@/components/VideoAnalytics/SocialVideosList";
import { VideoTrackingForm } from "@/components/VideoAnalytics/VideoTrackingForm";
import { toast } from "sonner";

function VideoAnalyticsContent() {
  const { signOut } = useAuth();

  const handleVideoTracked = () => {
    toast.success("Vídeo enviado para análise!", {
      description: "O vídeo está sendo processado. Aguarde alguns instantes e recarregue a página.",
    });
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
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
              Análise de Vídeos Sociais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Acompanhe o desempenho dos seus vídeos do TikTok e Instagram com métricas detalhadas e análises em tempo real
            </p>
          </div>

          {/* Form de rastreamento */}
          <VideoTrackingForm onVideoTracked={handleVideoTracked} />

          {/* Tabs para TikTok e Instagram */}
          <Tabs defaultValue="tiktok" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="tiktok" className="flex items-center gap-2">
                <span className="text-lg">🎵</span>
                TikTok
              </TabsTrigger>
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <span className="text-lg">📸</span>
                Instagram
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tiktok" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                <h3 className="text-xl font-bold text-foreground">
                  Vídeos do TikTok
                </h3>
              </div>
              <SocialVideosList platform="tiktok" />
            </TabsContent>
            
            <TabsContent value="instagram" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
                <h3 className="text-xl font-bold text-foreground">
                  Vídeos do Instagram
                </h3>
              </div>
              <SocialVideosList platform="instagram" />
            </TabsContent>
          </Tabs>
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
