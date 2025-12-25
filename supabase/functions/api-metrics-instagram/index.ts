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

// ============ INSTAGRAM CLIENT ============
class InstagramClient {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getFollowersCount(): Promise<number> {
    const { data, error } = await this.supabase
      .from('instagram_accounts')
      .select('followers_count')
      .eq('approval_status', 'approved');

    if (error) throw error;
    return data?.reduce((sum: number, acc: any) => sum + (acc.followers_count || 0), 0) || 0;
  }

  async getInsights(range: string): Promise<{ views: number; likes: number; shares: number }> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select('views_count, likes_count, shares_count, posted_at')
      .gte('posted_at', startDate.toISOString());

    if (error) throw error;

    const totals = data?.reduce((acc: any, post: any) => ({
      views: acc.views + (post.views_count || 0),
      likes: acc.likes + (post.likes_count || 0),
      shares: acc.shares + (post.shares_count || 0),
    }), { views: 0, likes: 0, shares: 0 }) || { views: 0, likes: 0, shares: 0 };

    return totals;
  }

  async getRecentPosts(range: string): Promise<RecentPost[]> {
    const days = this.parseRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select('id, caption, posted_at, views_count, likes_count, shares_count, post_url')
      .gte('posted_at', startDate.toISOString())
      .order('posted_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((post: any) => ({
      id: post.id,
      title: post.caption?.substring(0, 100) || 'Instagram Post',
      publishedAt: post.posted_at,
      views: post.views_count || 0,
      likes: post.likes_count || 0,
      shares: post.shares_count || 0,
      url: post.post_url,
    }));
  }

  private parseRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 7;
  }
}

// ============ SERVICE ============
class InstagramMetricsService {
  private client: InstagramClient;

  constructor(client: InstagramClient) {
    this.client = client;
  }

  async getMetrics(range: string): Promise<Omit<NormalizedMetrics, 'cached' | 'cachedAt'>> {
    console.log(`[Instagram Service] Fetching metrics for range: ${range}`);

    const [followers, insights, recentPosts] = await Promise.all([
      this.client.getFollowersCount(),
      this.client.getInsights(range),
      this.client.getRecentPosts(range),
    ]);

    return {
      range,
      followers,
      views: insights.views,
      likes: insights.likes,
      shares: insights.shares,
      recentPosts,
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
      console.log(`[Instagram API] Auth failed: ${auth.error}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Instagram API] Authenticated user: ${auth.userId}`);

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '7d';
    const cacheKey = `instagram_metrics_${range}`;

    // Check cache
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify({ ...cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new InstagramClient(supabaseUrl, serviceKey);
    const service = new InstagramMetricsService(client);
    const metrics = await service.getMetrics(range);

    // Set cache
    setCache(cacheKey, { ...metrics, cachedAt: new Date().toISOString() });

    console.log(`[Instagram API] Metrics retrieved successfully for range ${range}`);

    return new Response(JSON.stringify({ ...metrics, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram API] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch Instagram metrics",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
