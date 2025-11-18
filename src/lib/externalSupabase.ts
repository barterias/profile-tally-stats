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
