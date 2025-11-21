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
  link: string;
  platform: string;
  likes: number;
  comments: number;
  views: number;
  post_image: string;
  video_url: string;
  collected_at: string;
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

export const externalSupabase = {
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

  async getVideoHistory(videoId: number): Promise<VideoHistory[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/video_history?select=*&video_id=eq.${videoId}&order=collected_at.asc`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar histórico");
    
    return response.json();
  },

  async getAllVideos(): Promise<Video[]> {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*&order=views.desc`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeos");
    
    return response.json();
  },

  async getTotalStats(): Promise<{ totalViews: number; totalVideos: number; totalCreators: number }> {
    const videos = await this.getAllVideos();
    const uniqueCreators = new Set(videos.map(v => v.platform)).size;
    
    return {
      totalViews: videos.reduce((sum, v) => sum + v.views, 0),
      totalVideos: videos.length,
      totalCreators: uniqueCreators,
    };
  },

  async getTopVideosToday(limit: number = 10): Promise<Video[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*&collected_at=gte.${todayISO}&order=views.desc&limit=${limit}`,
      { headers }
    );
    
    if (!response.ok) throw new Error("Erro ao buscar vídeos do dia");
    
    return response.json();
  },

  async getDailyRanking(): Promise<{ creator: string; views: number; videos: number }[]> {
    const videos = await this.getTopVideosToday(100);
    const creatorStats: Record<string, { views: number; videos: number }> = {};

    videos.forEach(video => {
      if (!creatorStats[video.platform]) {
        creatorStats[video.platform] = { views: 0, videos: 0 };
      }
      creatorStats[video.platform].views += video.views;
      creatorStats[video.platform].videos += 1;
    });

    return Object.entries(creatorStats)
      .map(([creator, stats]) => ({ creator, ...stats }))
      .sort((a, b) => b.views - a.views);
  },

  async getMonthlyRanking(): Promise<{ creator: string; views: number; videos: number }[]> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayISO = firstDay.toISOString();

    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/videos?select=*&collected_at=gte.${firstDayISO}&order=views.desc`,
      { headers }
    );

    if (!response.ok) throw new Error("Erro ao buscar ranking mensal");

    const videos = await response.json();
    const creatorStats: Record<string, { views: number; videos: number }> = {};

    videos.forEach((video: Video) => {
      if (!creatorStats[video.platform]) {
        creatorStats[video.platform] = { views: 0, videos: 0 };
      }
      creatorStats[video.platform].views += video.views;
      creatorStats[video.platform].videos += 1;
    });

    return Object.entries(creatorStats)
      .map(([creator, stats]) => ({ creator, ...stats }))
      .sort((a, b) => b.views - a.views);
  },

  async getOverallRanking(): Promise<{ creator: string; views: number; videos: number }[]> {
    const videos = await this.getAllVideos();
    const creatorStats: Record<string, { views: number; videos: number }> = {};

    videos.forEach(video => {
      if (!creatorStats[video.platform]) {
        creatorStats[video.platform] = { views: 0, videos: 0 };
      }
      creatorStats[video.platform].views += video.views;
      creatorStats[video.platform].videos += 1;
    });

    return Object.entries(creatorStats)
      .map(([creator, stats]) => ({ creator, ...stats }))
      .sort((a, b) => b.views - a.views);
  },
};

export const n8nWebhook = {
  async trackVideo(link: string): Promise<void> {
    const response = await fetch("https://jotav33.app.n8n.cloud/webhook/video-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link }),
    });
    
    if (!response.ok) throw new Error("Erro ao rastrear vídeo");
  },
};
