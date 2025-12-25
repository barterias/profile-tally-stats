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
interface PlatformMetrics {
  followers: number;
  views: number;
  likes: number;
  shares: number;
}

interface MetricsSummary {
  range: string;
  total: PlatformMetrics;
  byPlatform: {
    instagram: PlatformMetrics;
    tiktok: PlatformMetrics;
    youtube: PlatformMetrics;
  };
  cached: boolean;
  cachedAt?: string;
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

// ============ AGGREGATION SERVICE ============
class MetricsSummaryService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getSummary(range: string): Promise<Omit<MetricsSummary, 'cached' | 'cachedAt'>> {
    console.log(`[Summary Service] Fetching consolidated metrics for range: ${range}`);

    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [instagram, tiktok, youtube] = await Promise.all([
      this.getInstagramMetrics(startDate),
      this.getTikTokMetrics(startDate),
      this.getYouTubeMetrics(startDate),
    ]);

    const total: PlatformMetrics = {
      followers: instagram.followers + tiktok.followers + youtube.followers,
      views: instagram.views + tiktok.views + youtube.views,
      likes: instagram.likes + tiktok.likes + youtube.likes,
      shares: instagram.shares + tiktok.shares + youtube.shares,
    };

    return {
      range,
      total,
      byPlatform: {
        instagram,
        tiktok,
        youtube,
      },
    };
  }

  private async getInstagramMetrics(startDate: Date): Promise<PlatformMetrics> {
    const [accountsRes, postsRes] = await Promise.all([
      this.supabase
        .from('instagram_accounts')
        .select('followers_count')
        .eq('approval_status', 'approved'),
      this.supabase
        .from('instagram_posts')
        .select('views_count, likes_count, shares_count')
        .gte('posted_at', startDate.toISOString()),
    ]);

    const followers = accountsRes.data?.reduce((sum: number, acc: any) => 
      sum + (acc.followers_count || 0), 0) || 0;

    const posts = postsRes.data || [];
    const views = posts.reduce((sum: number, p: any) => sum + (p.views_count || 0), 0);
    const likes = posts.reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
    const shares = posts.reduce((sum: number, p: any) => sum + (p.shares_count || 0), 0);

    return { followers, views, likes, shares };
  }

  private async getTikTokMetrics(startDate: Date): Promise<PlatformMetrics> {
    const [accountsRes, videosRes] = await Promise.all([
      this.supabase
        .from('tiktok_accounts')
        .select('followers_count')
        .eq('approval_status', 'approved'),
      this.supabase
        .from('tiktok_videos')
        .select('views_count, likes_count, shares_count')
        .gte('posted_at', startDate.toISOString()),
    ]);

    const followers = accountsRes.data?.reduce((sum: number, acc: any) => 
      sum + (acc.followers_count || 0), 0) || 0;

    const videos = videosRes.data || [];
    const views = videos.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0);
    const likes = videos.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0);
    const shares = videos.reduce((sum: number, v: any) => sum + (v.shares_count || 0), 0);

    return { followers, views, likes, shares };
  }

  private async getYouTubeMetrics(startDate: Date): Promise<PlatformMetrics> {
    const [accountsRes, videosRes] = await Promise.all([
      this.supabase
        .from('youtube_accounts')
        .select('subscribers_count')
        .eq('approval_status', 'approved'),
      this.supabase
        .from('youtube_videos')
        .select('views_count, likes_count')
        .gte('published_at', startDate.toISOString()),
    ]);

    const followers = accountsRes.data?.reduce((sum: number, acc: any) => 
      sum + (acc.subscribers_count || 0), 0) || 0;

    const videos = videosRes.data || [];
    const views = videos.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0);
    const likes = videos.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0);

    return { followers, views, likes, shares: 0 };
  }

  private parseRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 7;
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
      console.log(`[Summary API] Auth failed: ${auth.error}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Summary API] Authenticated user: ${auth.userId}`);

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '7d';
    const cacheKey = `metrics_summary_${range}`;

    // Check cache
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify({ ...cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = new MetricsSummaryService(supabaseUrl, serviceKey);
    const summary = await service.getSummary(range);

    // Set cache
    setCache(cacheKey, { ...summary, cachedAt: new Date().toISOString() });

    console.log(`[Summary API] Metrics consolidated successfully for range ${range}`);

    return new Response(JSON.stringify({ ...summary, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Summary API] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch metrics summary",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
