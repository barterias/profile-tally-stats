import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import StatCard from "@/components/Dashboard/StatCard";
import ChartCard from "@/components/Dashboard/ChartCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Eye,
  Trophy,
  TrendingUp,
  Upload,
  User,
  Video,
  Target,
  ArrowRight,
  Instagram,
  ExternalLink,
  Heart,
  MessageCircle,
  Youtube,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface UnifiedPost {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  posted_at: string | null;
}

export default function UserDashboard() {
  const { user, isAdmin, isClient } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalVideosSubmitted: 0,
    activeCampaigns: 0,
    submittedPosts: 0,
  });
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<UnifiedPost[]>([]);
  const [mostViewedPost, setMostViewedPost] = useState<UnifiedPost | null>(null);

  // Redirect admins and clients to their respective dashboards
  useEffect(() => {
    if (isAdmin) {
      navigate('/dashboard/admin', { replace: true });
      return;
    }
    if (isClient) {
      navigate('/dashboard/client', { replace: true });
      return;
    }
  }, [isAdmin, isClient, navigate]);

  useEffect(() => {
    if (!isAdmin && !isClient && user?.id) {
      fetchUserData();
    }
  }, [user, isAdmin, isClient]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar vídeos submetidos pelo usuário em campanhas
      const { data: userVideos } = await supabase
        .from("campaign_videos")
        .select("*")
        .eq("submitted_by", user.id);

      // Buscar competições ativas
      const { data: activeCampaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true);

      // Buscar contas do usuário
      const [instagramAccs, tiktokAccs, youtubeAccs] = await Promise.all([
        supabase.from('instagram_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('tiktok_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('youtube_accounts').select('id').eq('user_id', user.id).eq('is_active', true),
      ]);

      const instagramIds = (instagramAccs.data || []).map(a => a.id);
      const tiktokIds = (tiktokAccs.data || []).map(a => a.id);
      const youtubeIds = (youtubeAccs.data || []).map(a => a.id);

      // Buscar posts/vídeos de cada plataforma
      const allPosts: UnifiedPost[] = [];
      let instagramViews = 0;
      let tiktokViews = 0;
      let youtubeViews = 0;

      // Instagram posts
      if (instagramIds.length > 0) {
        const { data: igPosts } = await supabase
          .from('instagram_posts')
          .select('*')
          .in('account_id', instagramIds)
          .order('posted_at', { ascending: false, nullsFirst: false });

        (igPosts || []).forEach(post => {
          instagramViews += post.views_count || 0;
          allPosts.push({
            id: post.id,
            platform: 'instagram',
            url: post.post_url,
            title: post.caption,
            thumbnail_url: post.thumbnail_url,
            views_count: post.views_count || 0,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            posted_at: post.posted_at,
          });
        });
      }

      // TikTok videos
      if (tiktokIds.length > 0) {
        const { data: ttVideos } = await supabase
          .from('tiktok_videos')
          .select('*')
          .in('account_id', tiktokIds)
          .order('posted_at', { ascending: false, nullsFirst: false });

        (ttVideos || []).forEach(video => {
          tiktokViews += Number(video.views_count) || 0;
          allPosts.push({
            id: video.id,
            platform: 'tiktok',
            url: video.video_url,
            title: video.caption,
            thumbnail_url: video.thumbnail_url,
            views_count: Number(video.views_count) || 0,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            posted_at: video.posted_at,
          });
        });
      }

      // YouTube videos
      if (youtubeIds.length > 0) {
        const { data: ytVideos } = await supabase
          .from('youtube_videos')
          .select('*')
          .in('account_id', youtubeIds)
          .order('published_at', { ascending: false, nullsFirst: false });

        (ytVideos || []).forEach(video => {
          youtubeViews += Number(video.views_count) || 0;
          allPosts.push({
            id: video.id,
            platform: 'youtube',
            url: video.video_url,
            title: video.title,
            thumbnail_url: video.thumbnail_url,
            views_count: Number(video.views_count) || 0,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            posted_at: video.published_at,
          });
        });
      }

      const totalViews = instagramViews + tiktokViews + youtubeViews;

      // Set stats
      setStats({
        totalViews,
        totalVideosSubmitted: allPosts.length,
        activeCampaigns: activeCampaigns?.length || 0,
        submittedPosts: userVideos?.length || 0,
      });

      // Latest posts (sorted by date)
      const sortedByDate = [...allPosts].sort((a, b) => {
        const dateA = new Date(a.posted_at || '1970-01-01').getTime();
        const dateB = new Date(b.posted_at || '1970-01-01').getTime();
        return dateB - dateA;
      });
      setLatestPosts(sortedByDate.slice(0, 5));

      // Most viral post (sorted by views)
      const sortedByViews = [...allPosts].sort((a, b) => b.views_count - a.views_count);
      setMostViewedPost(sortedByViews[0] || null);

      // Platform distribution data
      const platforms = [];
      if (instagramViews > 0) {
        platforms.push({
          name: 'Instagram',
          value: instagramViews,
          color: 'hsl(340, 82%, 52%)',
        });
      }
      if (tiktokViews > 0) {
        platforms.push({
          name: 'TikTok',
          value: tiktokViews,
          color: 'hsl(var(--primary))',
        });
      }
      if (youtubeViews > 0) {
        platforms.push({
          name: 'YouTube',
          value: youtubeViews,
          color: 'hsl(0, 70%, 50%)',
        });
      }
      setPlatformData(platforms);

      // Generate evolution data from platform breakdown
      const evolutionFromPlatforms = [
        { date: 'Instagram', views: instagramViews },
        { date: 'TikTok', views: tiktokViews },
        { date: 'YouTube', views: youtubeViews },
      ].filter(p => p.views > 0);
      setEvolutionData(evolutionFromPlatforms);

    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-400" />;
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-400" />;
      case 'tiktok':
        return <Video className="h-4 w-4 text-primary" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-glow mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta! Aqui está seu desempenho
            </p>
          </div>
        </div>

        {/* Stats Grid - Removed Total Ganho */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Views"
            value={formatNumber(stats.totalViews)}
            icon={Eye}
          />
          <StatCard
            title="Vídeos no Sistema"
            value={stats.totalVideosSubmitted}
            icon={Video}
          />
          <StatCard
            title="Competições Ativas"
            value={stats.activeCampaigns}
            icon={Target}
          />
          <StatCard
            title="Seus Envios"
            value={stats.submittedPosts}
            icon={Upload}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolution Chart */}
          <ChartCard
            title="Views por Plataforma"
            subtitle="Distribuição de views entre plataformas"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  name="Views"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Platform Distribution */}
          <ChartCard
            title="Desempenho por Plataforma"
            subtitle="Distribuição de views"
          >
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {platformData.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{platform.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(platform.value)} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Latest Posts */}
        {latestPosts.length > 0 && (
          <Card className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Posts Recentes</h3>
                <p className="text-sm text-muted-foreground">
                  Seus últimos vídeos adicionados
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="glass-card-hover p-4 h-full">
                    <div className="flex items-center gap-3 mb-3">
                      {getPlatformIcon(post.platform)}
                      <span className="text-xs text-muted-foreground capitalize">
                        {post.platform}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(post.posted_at)}
                      </span>
                    </div>
                    {post.thumbnail_url && (
                      <img
                        src={post.thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-24 object-cover rounded-lg mb-3"
                      />
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.title || 'Sem título'}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-semibold">{formatNumber(post.views_count)}</p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{formatNumber(post.likes_count)}</p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{formatNumber(post.comments_count)}</p>
                        <p className="text-xs text-muted-foreground">Coment.</p>
                      </div>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Most Viewed Post */}
        {mostViewedPost && (
          <Card className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <div>
                <h3 className="font-semibold">Post Mais Viral</h3>
                <p className="text-sm text-muted-foreground">
                  Seu vídeo com melhor desempenho
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              {mostViewedPost.thumbnail_url && (
                <img
                  src={mostViewedPost.thumbnail_url}
                  alt="Thumbnail"
                  className="w-full md:w-48 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getPlatformIcon(mostViewedPost.platform)}
                  <span className="text-sm capitalize">{mostViewedPost.platform}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(mostViewedPost.posted_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {mostViewedPost.title || 'Sem título'}
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{formatNumber(mostViewedPost.views_count)}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <div>
                      <p className="text-xl font-bold">{formatNumber(mostViewedPost.likes_count)}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-xl font-bold">{formatNumber(mostViewedPost.comments_count)}</p>
                      <p className="text-xs text-muted-foreground">Comentários</p>
                    </div>
                  </div>
                </div>
                <a
                  href={mostViewedPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver post
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            onClick={() => navigate("/campaigns")}
          >
            <Trophy className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Competições</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Veja suas competições ativas e históricas
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Competições
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            style={{ animationDelay: "0.1s" }}
            onClick={() => navigate("/account-analytics")}
          >
            <TrendingUp className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Métricas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Acompanhe suas contas e métricas
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Métricas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>

          <Card
            className="glass-card-hover p-6 cursor-pointer animate-scale-in"
            style={{ animationDelay: "0.2s" }}
            onClick={() => navigate("/profile")}
          >
            <User className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Perfil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Edite suas informações e configurações
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Ver Perfil
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
