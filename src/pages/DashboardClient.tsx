import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, CheckCircle, TrendingUp, Calendar, BarChart3, Activity, PieChart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface CampaignMetrics {
  campaignName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalViews: number;
  totalVideos: number;
  totalEngagement: number;
  platformViews: { platform: string; views: number }[];
  platformEngagement: { platform: string; engagement: number }[];
  platformDistribution: { name: string; value: number }[];
}

function DashboardClientContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchClientData();
    }
  }, [user?.id]);

  const fetchClientData = async () => {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user!.id)
        .maybeSingle();
      setUsername(profile?.username || "Cliente");

      // Get owned campaigns
      const { data: ownership } = await supabase
        .from("campaign_owners")
        .select("campaign_id")
        .eq("user_id", user!.id);

      const campaignIds = (ownership || []).map((o) => o.campaign_id);

      if (campaignIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get campaign details
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .in("id", campaignIds)
        .limit(1)
        .maybeSingle();

      if (!campaign) {
        setLoading(false);
        return;
      }

      // Get campaign videos
      const { data: videos } = await supabase
        .from("campaign_videos")
        .select("platform, views, likes, comments, shares")
        .eq("campaign_id", campaign.id);

      const vids = videos || [];

      // Calculate platform metrics
      const platformMap = new Map<string, { views: number; engagement: number; count: number }>();
      for (const v of vids) {
        const p = v.platform || "Outro";
        const existing = platformMap.get(p) || { views: 0, engagement: 0, count: 0 };
        existing.views += Number(v.views || 0);
        existing.engagement += Number(v.likes || 0) + Number(v.comments || 0) + Number(v.shares || 0);
        existing.count += 1;
        platformMap.set(p, existing);
      }

      const platformViews = Array.from(platformMap.entries()).map(([platform, d]) => ({
        platform: formatPlatformName(platform),
        views: d.views,
      }));

      const platformEngagement = Array.from(platformMap.entries()).map(([platform, d]) => ({
        platform: formatPlatformName(platform),
        engagement: d.engagement,
      }));

      const platformDistribution = Array.from(platformMap.entries()).map(([platform, d]) => ({
        name: formatPlatformName(platform),
        value: d.count,
      }));

      const totalViews = vids.reduce((s, v) => s + Number(v.views || 0), 0);
      const totalEngagement = vids.reduce(
        (s, v) => s + Number(v.likes || 0) + Number(v.comments || 0) + Number(v.shares || 0),
        0
      );

      setMetrics({
        campaignName: campaign.name,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        isActive: campaign.is_active,
        totalViews,
        totalVideos: vids.length,
        totalEngagement,
        platformViews,
        platformEngagement,
        platformDistribution,
      });
    } catch (error) {
      console.error("Error fetching client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPlatformName = (p: string) => {
    const map: Record<string, string> = {
      tiktok: "TikTok",
      instagram: "Instagram",
      youtube: "YouTube",
      kwai: "Kwai",
    };
    return map[p.toLowerCase()] || p;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("pt-BR");
  };

  const getCampaignStatus = () => {
    if (!metrics) return { label: "—", sub: "" };
    const end = new Date(metrics.endDate);
    const now = new Date();
    if (now > end) {
      return { label: "Campanha finalizada", sub: `Até ${format(end, "dd 'de' MMMM", { locale: ptBR })}` };
    }
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `${diff} dias restantes`, sub: `Até ${format(end, "dd 'de' MMMM", { locale: ptBR })}` };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!metrics) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma campanha encontrada</h2>
          <p className="text-muted-foreground">Aguarde o admin designar uma campanha para você.</p>
        </div>
      </MainLayout>
    );
  }

  const campaignStatus = getCampaignStatus();
  const COLORS = ["hsl(0, 70%, 55%)", "hsl(340, 70%, 55%)", "hsl(220, 70%, 55%)", "hsl(140, 70%, 55%)"];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Olá, {username}!</h1>
            <p className="text-muted-foreground text-sm">{metrics.campaignName}</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-950/40 border-blue-800/30">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-300">Views Totais</span>
                <Eye className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{formatNumber(metrics.totalViews)}</p>
              <p className="text-xs text-muted-foreground mt-1">Desde o início da campanha</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-950/40 border-emerald-800/30">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-300">Vídeos Entregues</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{metrics.totalVideos}</p>
              <p className="text-xs text-muted-foreground mt-1">Total de vídeos na campanha</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-950/40 border-amber-800/30">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-amber-300">Engajamento</span>
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{formatNumber(metrics.totalEngagement)}</p>
              <p className="text-xs text-muted-foreground mt-1">Interações totais</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Views por Plataforma */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Views por Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.platformViews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="platform" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [formatNumber(value), "Views"]}
                    />
                    <Bar dataKey="views" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Engajamento por Plataforma */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Engajamento por Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.platformEngagement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="platform" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [formatNumber(value), "Engajamento"]}
                    />
                    <Bar dataKey="engagement" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Distribuição por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={metrics.platformDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                    >
                      {metrics.platformDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend
                      formatter={(value, entry: any) => {
                        const item = metrics.platformDistribution.find((d) => d.name === value);
                        return `${value} (${item?.value || 0})`;
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardClient() {
  return (
    <ProtectedRoute>
      <DashboardClientContent />
    </ProtectedRoute>
  );
}
