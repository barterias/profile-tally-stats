import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, TrendingUp, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string;
  platform: string;
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
}

export default function Campaigns() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram") return "📸";
    if (platform === "tiktok") return "🎵";
    return "📱";
  };

  return (
    <div className="min-h-screen gradient-bg-dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary animate-float" />
            <h1 className="text-2xl font-bold text-glow">Campeonatos</h1>
          </div>
          <nav className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>Início</Button>
            <Button variant="ghost" onClick={() => navigate("/video-analytics")}>Analytics</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-glow">
            Participe dos Nossos Campeonatos
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Mostre seu talento, compita com os melhores e ganhe prêmios incríveis!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="glass-card hover-glow p-6 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campeonatos Ativos</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.is_active).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Participantes</p>
                <p className="text-2xl font-bold">250+</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card hover-glow p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vídeos Enviados</p>
                <p className="text-2xl font-bold">1.2K+</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign, index) => (
            <Card
              key={campaign.id}
              className="glass-card hover-glow p-6 animate-scale-in group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(`/campaign/${campaign.id}`)}
            >
              {/* Platform Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{getPlatformIcon(campaign.platform)}</span>
                <Badge className={campaign.is_active ? "bg-success" : "bg-muted"}>
                  {campaign.is_active ? "Ativo" : "Encerrado"}
                </Badge>
              </div>

              {/* Campaign Info */}
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                {campaign.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {campaign.description}
              </p>

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })} -{" "}
                    {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Prize */}
              {campaign.prize_description && (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-semibold text-primary">🏆 {campaign.prize_description}</p>
                </div>
              )}

              {/* CTA */}
              <Button className="w-full mt-4 neon-border" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Participar
              </Button>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && !loading && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">Nenhum campeonato disponível no momento</p>
          </div>
        )}
      </main>
    </div>
  );
}
