import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TYPES ============
interface NormalizedMetrics {
  range: string;
  followers: number;
  views: number;
  likes: number;
  shares: number;
  recentPosts: RecentPost[];
}

interface RecentPost {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  shares: number;
  url: string;
}

// ============ YOUTUBE CLIENT ============
class YouTubeClient {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getChannelStats(): Promise<{ subscribers: number; totalViews: number }> {
    const { data, error } = await this.supabase
      .from('youtube_accounts')
      .select('subscribers_count, total_views')
      .eq('approval_status', 'approved');

    if (error) throw error;

    const totals = data?.reduce((acc: any, channel: any) => ({
      subscribers: acc.subscribers + (channel.subscribers_count || 0),
      totalViews: acc.totalViews + (channel.total_views || 0),
    }), { subscribers: 0, totalViews: 0 }) || { subscribers: 0, totalViews: 0 };

    return totals;
  }

  async getStats(range: string): Promise<{ views: number; likes: number; shares: number }> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('youtube_videos')
      .select('views_count, likes_count, published_at')
      .gte('published_at', startDate.toISOString());

    if (error) throw error;

    const totals = data?.reduce((acc: any, video: any) => ({
      views: acc.views + (video.views_count || 0),
      likes: acc.likes + (video.likes_count || 0),
    }), { views: 0, likes: 0 }) || { views: 0, likes: 0 };

    // YouTube API doesn't provide shares directly, returning 0
    return { ...totals, shares: 0 };
  }

  async getRecentVideos(range: string): Promise<RecentPost[]> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('youtube_videos')
      .select('id, title, published_at, views_count, likes_count, video_url')
      .gte('published_at', startDate.toISOString())
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((video: any) => ({
      id: video.id,
      title: video.title || 'YouTube Video',
      publishedAt: video.published_at,
      views: video.views_count || 0,
      likes: video.likes_count || 0,
      shares: 0, // YouTube doesn't provide share count
      url: video.video_url,
    }));
  }

  private parseRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 7;
  }
}

// ============ SERVICE ============
class YouTubeMetricsService {
  private client: YouTubeClient;

  constructor(client: YouTubeClient) {
    this.client = client;
  }

  async getMetrics(range: string): Promise<NormalizedMetrics> {
    console.log(`[YouTube Service] Fetching metrics for range: ${range}`);

    const [channelStats, stats, recentVideos] = await Promise.all([
      this.client.getChannelStats(),
      this.client.getStats(range),
      this.client.getRecentVideos(range),
    ]);

    return {
      range,
      followers: channelStats.subscribers,
      views: stats.views,
      likes: stats.likes,
      shares: stats.shares,
      recentPosts: recentVideos,
    };
  }
}

// ============ HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '7d';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const client = new YouTubeClient(supabaseUrl, supabaseKey);
    const service = new YouTubeMetricsService(client);
    const metrics = await service.getMetrics(range);

    console.log(`[YouTube API] Metrics retrieved successfully for range ${range}`);

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[YouTube API] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch YouTube metrics",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
