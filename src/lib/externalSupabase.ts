// Cliente para o Supabase externo (análise de vídeos)
const EXTERNAL_SUPABASE_URL = "https://vgyhklhrzaeekiymsltr.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneWhrbGhyemFlZWtpeW1zbHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzE0MTQsImV4cCI6MjA3OTAwNzQxNH0.7lAiL3RuDaUts0tH_OyvJ0Ceg8cmNaDDnKG3XQvUxgQ";

const headers = {
  apikey: EXTERNAL_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export interface Video {
  id: number;
  platform: string;
  video_id?: string;
  video_url: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  downloads?: number;
  music_id?: string;
  music_title?: string;
  music_author?: string;
  music_cover?: string;
  music_url?: string;
  creator_id?: string;
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar?: string;
  create_time?: number;
  inserted_at: string;
  // Campos da tabela 'videos' (Instagram)
  link?: string;
  post_image?: string;
  collected_at?: string;
  // Campos da tabela 'youtube_videos' (YouTube)
  youtube_id?: string;
  channel_name?: string;
  channel_id?: string;
  duration_seconds?: number;
  video_download_url?: string;
}

export interface VideoHistory {
  id: number;
  video_id: number;
  likes: number;
  comments: number;
  views: number;
  collected_at: string;
}

export interface Creator {
  id: number;
  name: string;
  total_views: number;
  total_videos: number;
  platform: string;
}

export interface DailyRanking {
  date: string;
  creator_name: string;
  daily_views: number;
  daily_videos: number;
}

export interface MonthlyRanking {
  month: string;
  creator_name: string;
  monthly_views: number;
  monthly_videos: number;
}

// Views interfaces
export interface UnifiedPost {
  id: number;
  platform: string;
  link: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  thumbnail?: string;
  created_at: string;
}

export interface RankingEntry {
  position: number;
  platform: string;
  link: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  thumbnail?: string;
}

export interface DailyGrowth {
  date: string;
  total_views: number;
  total_posts: number;
  instagram_views: number;
  tiktok_views: number;
}

export interface PlatformInsight {
  platform: string;
  total_views: number;
  total_posts: number;
  avg_views_per_post: number;
}

export const externalSupabase = {
  // ========== Tabelas ==========
  async getVideoByLink(link: string): Promise<Video | null> {
    const encodedLink = encodeURIComponent(link);
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*&link=eq.${encodedLink}`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeo");
    
    const data = await response.json();
    return data[0] || null;
  },

  async getAllVideos(): Promise<Video[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*&order=views.desc`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeos");
    
    return response.json();
  },

  async getSocialVideos(): Promise<Video[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/social_videos?select=*&order=views.desc`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeos sociais");
    
    return response.json();
  },

  async getYoutubeVideos(): Promise<Video[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/youtube_videos?select=*&order=views.desc`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeos do YouTube");
    
    const data = await response.json();
    // Map YouTube fields to Video interface
    return data.map((v: any) => ({
      id: v.id,
      platform: "youtube",
      video_id: v.youtube_id,
      video_url: v.video_download_url || "",
      link: `https://youtube.com/shorts/${v.youtube_id}`,
      title: v.title,
      thumbnail: v.thumbnail_url,
      duration: v.duration_seconds,
      views: v.views || 0,
      likes: v.likes || 0,
      comments: v.comments || 0,
      shares: 0,
      creator_username: v.channel_name,
      creator_nickname: v.channel_name,
      inserted_at: v.created_at,
      youtube_id: v.youtube_id,
      channel_name: v.channel_name,
      channel_id: v.channel_id,
    }));
  },

  // ========== Views ==========
  async getTotalViews(): Promise<number> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/total_views?select=total_views`,
      { headers }
    );
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    return data[0]?.total_views || 0;
  },

  async getLatestPosts(limit: number = 10): Promise<UnifiedPost[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/latest_posts?select=*&limit=${limit}`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    return response.json();
  },

  async getMostViewedPost(): Promise<UnifiedPost | null> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/most_viewed_post?select=*&limit=1`,
      { headers }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data[0] || null;
  },

  async getRankingGlobal(limit: number = 100): Promise<RankingEntry[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/ranking_global?select=*&limit=${limit}`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    return response.json();
  },

  async getRankingDaily(limit: number = 100): Promise<RankingEntry[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/ranking_daily?select=*&limit=${limit}`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    return response.json();
  },

  async getDailyGrowth(days: number = 30): Promise<DailyGrowth[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/daily_growth?select=*&order=date.desc&limit=${days}`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.reverse(); // Retornar em ordem cronológica
  },

  async getPlatformInsights(): Promise<PlatformInsight[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/platform_insights?select=*`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    return response.json();
  },

  async getUnifiedPosts(limit?: number): Promise<UnifiedPost[]> {
    const url = limit 
      ? `${EXTERNAL_SUPABASE_URL}/rest/v1/unified_posts?select=*&order=created_at.desc&limit=${limit}`
      : `${EXTERNAL_SUPABASE_URL}/rest/v1/unified_posts?select=*&order=created_at.desc`;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) return [];
    
    return response.json();
  },
};

export const n8nWebhook = {
  async trackVideo(link: string): Promise<void> {
    const encodedLink = encodeURIComponent(link);
    const response = await fetch(`https://jotav33.app.n8n.cloud/webhook/video-tracker?link=${encodedLink}`, {
      method: "GET",
    });
    
    if (!response.ok) throw new Error("Erro ao rastrear vídeo");
  },
};
