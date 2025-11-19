import { useQuery } from "@tanstack/react-query";
import { Trophy, Eye, Video, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { externalSupabase } from "@/lib/externalSupabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function CreatorsContent() {
  const { signOut } = useAuth();

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["creators-ranking"],
    queryFn: () => externalSupabase.getOverallRanking(),
  });

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50 animate-fade-in">
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
          <div className="flex items-center gap-3 animate-slide-up">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Clipadores
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ranking geral de todos os clipadores - Total: {ranking?.length || 0}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ranking?.map((item, index) => (
                <Card 
                  key={`${item.creator}-${index}`} 
                  className="overflow-hidden bg-gradient-to-br from-card via-card/95 to-card/80 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 group animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-2xl font-bold text-primary">
                          {item.creator.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                        </div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {item.creator}
                        </h3>
                        <p className="text-xs text-muted-foreground">Clipador</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Views</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {item.views.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Video className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Vídeos</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {item.videos}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Creators() {
  return (
    <ProtectedRoute>
      <CreatorsContent />
    </ProtectedRoute>
  );
}
