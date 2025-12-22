import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSocialMetrics } from "@/hooks/useSocialMetrics";
import { useAllInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useAllTikTokAccounts } from "@/hooks/useTikTokAccounts";
import { useAllYouTubeAccounts } from "@/hooks/useYouTubeAccounts";
import { PlatformTooltip, BarChartTooltip } from "@/components/Charts/CustomTooltip";
import { AdminSubmitVideoModal } from "@/components/Admin/AdminSubmitVideoModal";
import {
  BarChart3,
  Eye,
  Users,
  Trophy,
  TrendingUp,
  Instagram,
  Youtube,
  Calendar,
  Plus,
  Video,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// TikTok SVG Icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Video icon component for stats
const VideoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 8-6 4 6 4V8Z"/>
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
  </svg>
);

function AdminStatsContent() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaignStats, setCampaignStats] = useState<any[]>([]);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);

  // Use real data from social metrics hook
  const { data: socialMetrics, isLoading: metricsLoading, refetch } = useSocialMetrics();
  const { data: instagramAccounts = [] } = useAllInstagramAccounts();
  const { data: tiktokAccounts = [] } = useAllTikTokAccounts();
  const { data: youtubeAccounts = [] } = useAllYouTubeAccounts();

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchCampaignStats();
  }, [isAdmin]);

  const fetchCampaignStats = async () => {
    try {
      // Fetch campaigns with stats from database
      const { data: campaigns } = await supabase.from("campaigns").select("*");
      
      // Calculate campaign stats from campaign_videos table
      const campaignWithStats = await Promise.all(
        (campaigns || []).slice(0, 5).map(async (campaign) => {
          const { data: videos } = await supabase
            .from("campaign_videos")
            .select("*")
            .eq("campaign_id", campaign.id);

          const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;
          const participants = new Set(videos?.map((v) => v.submitted_by)).size;

          return {
            name: campaign.name.slice(0, 20),
            videos: videos?.length || 0,
            views: totalViews,
            participants,
            active: campaign.is_active,
          };
        })
      );
      setCampaignStats(campaignWithStats);
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get counts from real data
  const totalAccounts = instagramAccounts.length + tiktokAccounts.length + youtubeAccounts.length;

  // Platform data from social metrics - Brand colors
  const platformColors: Record<string, string> = {
    Instagram: '#E1306C',   // Instagram pink/purple
    TikTok: '#25F4EE',      // TikTok turquoise
    YouTube: '#FF0000',     // YouTube red
  };

  const platformData = socialMetrics?.platformBreakdown.map(p => ({
    name: p.platform,
    value: p.accounts,
    views: p.views,
    color: platformColors[p.platform] || '#a78bfa',
  })) || [];

  if (loading || metricsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-glow">Estatísticas Gerais</h1>
              <p className="text-muted-foreground">
                Visão completa do desempenho da plataforma
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddVideoModal(true)} className="w-fit">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Vídeo
          </Button>
        </div>

        {/* Add Video Modal */}
        <AdminSubmitVideoModal
          open={showAddVideoModal}
          onOpenChange={setShowAddVideoModal}
          onSuccess={() => {
            refetch();
            fetchCampaignStats();
          }}
        />

        {/* Stats Grid - Real data from API */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total de Vídeos"
            value={(socialMetrics?.totalVideos || 0).toLocaleString()}
            icon={Video}
          />
          <StatCard
            title="Views Totais"
            value={(socialMetrics?.totalViews || 0).toLocaleString()}
            icon={Eye}
          />
          <StatCard
            title="Seguidores"
            value={(socialMetrics?.totalFollowers || 0).toLocaleString()}
            icon={Users}
          />
          <StatCard
            title="Curtidas"
            value={(socialMetrics?.totalLikes || 0).toLocaleString()}
            icon={TrendingUp}
          />
          <StatCard
            title="Contas Conectadas"
            value={totalAccounts}
            icon={Trophy}
          />
          <StatCard
            title="Campanhas"
            value={campaignStats.length}
            icon={Calendar}
          />
        </div>

        {/* Platform Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-r from-pink-500/10 to-pink-500/5 border-pink-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Instagram className="h-6 w-6 text-pink-500" />
              <h3 className="font-semibold">Instagram</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold">{instagramAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Contas</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.followers.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'Instagram')?.views.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-[#25F4EE]/10 to-[#FE2C55]/5 border-[#25F4EE]/20">
            <div className="flex items-center gap-3 mb-4">
              <TikTokIcon className="h-6 w-6 text-[#25F4EE]" />
              <h3 className="font-semibold">TikTok</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold">{tiktokAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Contas</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.followers.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'TikTok')?.views.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Youtube className="h-6 w-6 text-red-500" />
              <h3 className="font-semibold">YouTube</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold">{youtubeAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Canais</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.followers.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Inscritos</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {socialMetrics?.platformBreakdown.find(p => p.platform === 'YouTube')?.views.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <ChartCard title="Distribuição por Plataforma" subtitle="Contas e views">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={platformData.filter(p => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="transition-opacity hover:opacity-80" />
                      ))}
                    </Pie>
                    <Tooltip content={<PlatformTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-muted-foreground">
                  Total de Contas
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4">
                {platformData.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: platform.color }}
                    />
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {platform.value} contas • {platform.views.toLocaleString()} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Desempenho por Campanha" subtitle="Top 5 campanhas">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignStats} layout="vertical">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}>
                      <animate 
                        attributeName="stopOpacity" 
                        values="0.8;1;0.8" 
                        dur="2s" 
                        repeatCount="indefinite" 
                      />
                    </stop>
                    <stop offset="50%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.9}>
                      <animate 
                        attributeName="offset" 
                        values="0.4;0.6;0.4" 
                        dur="3s" 
                        repeatCount="indefinite" 
                      />
                    </stop>
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8}>
                      <animate 
                        attributeName="stopOpacity" 
                        values="0.6;0.9;0.6" 
                        dur="2.5s" 
                        repeatCount="indefinite" 
                      />
                    </stop>
                  </linearGradient>
                  <linearGradient id="barGradientHover" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(280, 85%, 65%)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={100}
                />
                <Tooltip content={<BarChartTooltip />} />
                <Bar 
                  dataKey="videos" 
                  fill="url(#barGradient)" 
                  radius={[0, 4, 4, 0]} 
                  name="Vídeos"
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  className="transition-all duration-300 hover:brightness-110"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Campaign Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Resumo de Campanhas
            </CardTitle>
            <CardDescription>
              Performance detalhada de cada campanha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignStats.map((campaign, index) => (
                <Card
                  key={index}
                  className={`p-4 ${
                    campaign.active
                      ? "border-primary/30 bg-primary/5"
                      : "bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold truncate">{campaign.name}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        campaign.active
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {campaign.active ? "Ativa" : "Encerrada"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{campaign.videos}</p>
                      <p className="text-xs text-muted-foreground">Vídeos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{campaign.participants}</p>
                      <p className="text-xs text-muted-foreground">Participantes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {campaign.views > 1000
                          ? `${(campaign.views / 1000).toFixed(1)}k`
                          : campaign.views}
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function AdminStats() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminStatsContent />
    </ProtectedRoute>
  );
}
