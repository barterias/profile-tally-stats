import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import AppLayout from "@/components/Layout/AppLayout";
import StatCard from "@/components/Dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Video, Trophy, TrendingUp, Save } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: user?.email || "",
  });
  const [stats, setStats] = useState({
    totalViews: 0,
    totalVideos: 0,
    campaigns: 0,
    avgRank: 0,
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) {
      setProfile({
        username: data.username || "",
        email: user?.email || "",
      });
    }
  };

  const fetchStats = async () => {
    // Fetch user stats
    const { data: videos } = await supabase
      .from("campaign_videos")
      .select("*, campaigns(*)")
      .eq("submitted_by", user?.id);

    // Buscar métricas reais das views externas
    let totalViews = 0;
    if (videos && videos.length > 0) {
      const viewsPromises = videos.map(async (video) => {
        try {
          if (video.platform === "instagram") {
            const instagramData = await externalSupabase.getVideoByLink(video.video_link);
            return instagramData?.views || 0;
          } else if (video.platform === "tiktok") {
            const allSocialVideos = await externalSupabase.getSocialVideos();
            const tiktokData = allSocialVideos.find((v) =>
              v.link === video.video_link || v.video_url?.includes(video.video_link)
            );
            return tiktokData?.views || 0;
          }
        } catch (error) {
          console.error("Erro ao buscar métricas do vídeo:", error);
        }
        return 0;
      });

      const viewsArray = await Promise.all(viewsPromises);
      totalViews = viewsArray.reduce((sum, views) => sum + views, 0);
    }

    const campaigns = new Set(videos?.map((v) => v.campaign_id)).size;

    // Calcular ranking médio baseado em todas as campanhas do usuário
    let avgRank = 0;
    if (videos && videos.length > 0) {
      const campaignIds = [...new Set(videos.map((v) => v.campaign_id))];
      const rankPromises = campaignIds.map(async (campaignId) => {
        const { data: allVideos } = await supabase
          .from("campaign_videos")
          .select("submitted_by, views")
          .eq("campaign_id", campaignId)
          .order("views", { ascending: false });

        const userRank = allVideos?.findIndex((v) => v.submitted_by === user?.id);
        return userRank !== undefined && userRank >= 0 ? userRank + 1 : 0;
      });

      const ranks = await Promise.all(rankPromises);
      const validRanks = ranks.filter((r) => r > 0);
      avgRank = validRanks.length > 0
        ? Math.round(validRanks.reduce((sum, r) => sum + r, 0) / validRanks.length)
        : 0;
    }

    setStats({
      totalViews,
      totalVideos: videos?.length || 0,
      campaigns,
      avgRank,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: profile.username })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-glow mb-2">Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais
          </p>
        </div>

        {/* Profile Card */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-24 w-24 border-4 border-primary/50">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {user?.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {profile.username || "Usuário"}
              </h2>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                placeholder="Seu nome de usuário"
                value={profile.username}
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="premium-gradient"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Estatísticas Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total de Views"
              value={stats.totalViews.toLocaleString()}
              icon={Eye}
            />
            <StatCard
              title="Vídeos Enviados"
              value={stats.totalVideos}
              icon={Video}
            />
            <StatCard
              title="Competições"
              value={stats.campaigns}
              subtitle="participações"
              icon={Trophy}
            />
            <StatCard
              title="Ranking Médio"
              value={stats.avgRank > 0 ? `#${stats.avgRank}` : "-"}
              icon={TrendingUp}
            />
          </div>
        </div>

        {/* Account Settings */}
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Configurações da Conta</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">
                  Receba atualizações sobre suas competições
                </p>
              </div>
              <Button variant="outline">Configurar</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Privacidade</p>
                <p className="text-sm text-muted-foreground">
                  Controle quem pode ver seu perfil
                </p>
              </div>
              <Button variant="outline">Gerenciar</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Excluir Conta</p>
                <p className="text-sm text-muted-foreground">
                  Remover permanentemente sua conta
                </p>
              </div>
              <Button variant="destructive">Excluir</Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
