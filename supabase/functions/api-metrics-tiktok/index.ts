import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ CACHE ============
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Cache] HIT for key: ${key}`);
    return cached.data;
  }
  if (cached) {
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  console.log(`[Cache] SET for key: ${key}, TTL: ${CACHE_TTL_MS}ms`);
}

// ============ TYPES ============
interface NormalizedMetrics {
  range: string;
  followers: number;
  views: number;
  likes: number;
  shares: number;
  recentPosts: RecentPost[];
  cached: boolean;
  cachedAt?: string;
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

// ============ AUTH HELPER ============
async function validateAuth(req: Request, supabaseUrl: string, supabaseKey: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  return { valid: true, userId: user.id };
}

// ============ TIKTOK CLIENT ============
class TikTokClient {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getFollowersCount(): Promise<number> {
    const { data, error } = await this.supabase
      .from('tiktok_accounts')
      .select('followers_count')
      .eq('approval_status', 'approved');

    if (error) throw error;
    return data?.reduce((sum: number, acc: any) => sum + (acc.followers_count || 0), 0) || 0;
  }

  async getStats(range: string): Promise<{ views: number; likes: number; shares: number }> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('tiktok_videos')
      .select('views_count, likes_count, shares_count, posted_at')
      .gte('posted_at', startDate.toISOString());

    if (error) throw error;

    const totals = data?.reduce((acc: any, video: any) => ({
      views: acc.views + (video.views_count || 0),
      likes: acc.likes + (video.likes_count || 0),
      shares: acc.shares + (video.shares_count || 0),
    }), { views: 0, likes: 0, shares: 0 }) || { views: 0, likes: 0, shares: 0 };

    return totals;
  }

  async getRecentVideos(range: string): Promise<RecentPost[]> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('tiktok_videos')
      .select('id, caption, posted_at, views_count, likes_count, shares_count, video_url')
      .gte('posted_at', startDate.toISOString())
      .order('posted_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((video: any) => ({
      id: video.id,
      title: video.caption?.substring(0, 100) || 'TikTok Video',
      publishedAt: video.posted_at,
      views: video.views_count || 0,
      likes: video.likes_count || 0,
      shares: video.shares_count || 0,
      url: video.video_url,
    }));
  }

  private parseRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 7;
  }
}

// ============ SERVICE ============
class TikTokMetricsService {
  private client: TikTokClient;

  constructor(client: TikTokClient) {
    this.client = client;
  }

  async getMetrics(range: string): Promise<Omit<NormalizedMetrics, 'cached' | 'cachedAt'>> {
    console.log(`[TikTok Service] Fetching metrics for range: ${range}`);

    const [followers, stats, recentVideos] = await Promise.all([
      this.client.getFollowersCount(),
      this.client.getStats(range),
      this.client.getRecentVideos(range),
    ]);

    return {
      range,
      followers,
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Validate JWT
    const auth = await validateAuth(req, supabaseUrl, supabaseKey);
    if (!auth.valid) {
      console.log(`[TikTok API] Auth failed: ${auth.error}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[TikTok API] Authenticated user: ${auth.userId}`);

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '7d';
    const cacheKey = `tiktok_metrics_${range}`;

    // Check cache
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify({ ...cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new TikTokClient(supabaseUrl, serviceKey);
    const service = new TikTokMetricsService(client);
    const metrics = await service.getMetrics(range);

    // Set cache
    setCache(cacheKey, { ...metrics, cachedAt: new Date().toISOString() });

    console.log(`[TikTok API] Metrics retrieved successfully for range ${range}`);

    return new Response(JSON.stringify({ ...metrics, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TikTok API] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch TikTok metrics",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
