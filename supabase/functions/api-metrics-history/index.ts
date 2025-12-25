import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ CACHE ============
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for history

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
interface HistoryDataPoint {
  date: string;
  instagram: PlatformMetrics;
  tiktok: PlatformMetrics;
  youtube: PlatformMetrics;
  total: PlatformMetrics;
}

interface PlatformMetrics {
  followers: number;
  views: number;
  likes: number;
  comments: number;
}

interface HistoryResponse {
  range: string;
  granularity: string;
  dataPoints: HistoryDataPoint[];
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

// ============ HISTORY SERVICE ============
class MetricsHistoryService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getHistory(range: string, granularity: string): Promise<Omit<HistoryResponse, 'cached' | 'cachedAt'>> {
    console.log(`[History Service] Fetching history for range: ${range}, granularity: ${granularity}`);

    const days = this.parseRange(range);
    const dates = this.generateDateRange(days, granularity);

    const [instagramHistory, tiktokHistory, youtubeHistory] = await Promise.all([
      this.getInstagramHistory(days),
      this.getTikTokHistory(days),
      this.getYouTubeHistory(days),
    ]);

    const dataPoints: HistoryDataPoint[] = dates.map(date => {
      const instagram = this.aggregateForDate(instagramHistory, date, granularity);
      const tiktok = this.aggregateForDate(tiktokHistory, date, granularity);
      const youtube = this.aggregateForDate(youtubeHistory, date, granularity);

      return {
        date,
        instagram,
        tiktok,
        youtube,
        total: {
          followers: instagram.followers + tiktok.followers + youtube.followers,
          views: instagram.views + tiktok.views + youtube.views,
          likes: instagram.likes + tiktok.likes + youtube.likes,
          comments: instagram.comments + tiktok.comments + youtube.comments,
        },
      };
    });

    return {
      range,
      granularity,
      dataPoints,
    };
  }

  private async getInstagramHistory(days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('instagram_metrics_history')
      .select('recorded_at, followers_count, views_count, likes_count, comments_count')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('[History] Instagram fetch error:', error);
      return [];
    }
    return data || [];
  }

  private async getTikTokHistory(days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('tiktok_metrics_history')
      .select('recorded_at, followers_count, views_count, likes_count, comments_count')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('[History] TikTok fetch error:', error);
      return [];
    }
    return data || [];
  }

  private async getYouTubeHistory(days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('youtube_metrics_history')
      .select('recorded_at, subscribers_count, views_count, likes_count, comments_count')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('[History] YouTube fetch error:', error);
      return [];
    }
    return data || [];
  }

  private generateDateRange(days: number, granularity: string): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    if (granularity === 'hourly') {
      // Last 24 hours
      for (let i = 23; i >= 0; i--) {
        const date = new Date(today);
        date.setHours(date.getHours() - i);
        dates.push(date.toISOString().slice(0, 13) + ':00:00Z');
      }
    } else if (granularity === 'weekly') {
      // Weekly aggregation
      const weeks = Math.ceil(days / 7);
      for (let i = weeks - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        dates.push(date.toISOString().slice(0, 10));
      }
    } else {
      // Daily (default)
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0, 10));
      }
    }
    
    return dates;
  }

  private aggregateForDate(history: any[], targetDate: string, granularity: string): PlatformMetrics {
    const filtered = history.filter(record => {
      const recordDate = new Date(record.recorded_at);
      
      if (granularity === 'hourly') {
        return record.recorded_at.startsWith(targetDate.slice(0, 13));
      } else if (granularity === 'weekly') {
        const target = new Date(targetDate);
        const weekStart = new Date(target);
        weekStart.setDate(weekStart.getDate() - 7);
        return recordDate >= weekStart && recordDate <= target;
      } else {
        return record.recorded_at.startsWith(targetDate);
      }
    });

    if (filtered.length === 0) {
      return { followers: 0, views: 0, likes: 0, comments: 0 };
    }

    // Get the latest record for followers (cumulative), sum for engagement metrics
    const latestFollowers = filtered.reduce((max, r) => 
      Math.max(max, r.followers_count || r.subscribers_count || 0), 0);
    
    const totalViews = filtered.reduce((sum, r) => sum + (r.views_count || 0), 0);
    const totalLikes = filtered.reduce((sum, r) => sum + (r.likes_count || 0), 0);
    const totalComments = filtered.reduce((sum, r) => sum + (r.comments_count || 0), 0);

    return {
      followers: latestFollowers,
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
    };
  }

  private parseRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1]) : 30;
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
      console.log(`[History API] Auth failed: ${auth.error}`);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[History API] Authenticated user: ${auth.userId}`);

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';
    const granularity = url.searchParams.get('granularity') || 'daily'; // hourly, daily, weekly
    const cacheKey = `metrics_history_${range}_${granularity}`;

    // Check cache
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify({ ...cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = new MetricsHistoryService(supabaseUrl, serviceKey);
    const history = await service.getHistory(range, granularity);

    // Set cache
    setCache(cacheKey, { ...history, cachedAt: new Date().toISOString() });

    console.log(`[History API] History retrieved successfully for range ${range}, granularity ${granularity}`);

    return new Response(JSON.stringify({ ...history, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[History API] Error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch metrics history",
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
