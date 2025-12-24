import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "./externalSupabase";

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sincroniza as métricas de vídeos do banco externo para o campaign_videos
 */
export async function syncCampaignVideoMetrics(campaignId?: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  try {
    // Buscar vídeos da campanha
    let query = supabase.from("campaign_videos").select("*");
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    const { data: campaignVideos, error } = await query;

    if (error) {
      result.errors.push(`Erro ao buscar vídeos: ${error.message}`);
      return result;
    }

    if (!campaignVideos || campaignVideos.length === 0) {
      return result;
    }

    // Buscar todos os vídeos do banco externo (Instagram/TikTok) e do banco local (YouTube via ScrapeCreators)
    const [externalVideos, externalSocialVideos, localYoutubeVideos] = await Promise.all([
      externalSupabase.getAllVideos(),
      externalSupabase.getSocialVideos(),
      (async () => {
        const { data, error } = await supabase
          .from('youtube_videos')
          .select('video_url, views_count, likes_count, comments_count');

        if (error) {
          console.error('Erro ao buscar youtube_videos (local):', error);
          return [] as Array<{ video_url: string; views_count: number | null; likes_count: number | null; comments_count: number | null }>;
        }

        return (data || []) as Array<{ video_url: string; views_count: number | null; likes_count: number | null; comments_count: number | null }>;
      })(),
    ]);

    // Criar mapa de vídeos externos por link normalizado
    const externalVideoMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();

    for (const video of externalVideos) {
      const link = normalizeLink(video.link || video.video_url);
      if (link) {
        externalVideoMap.set(link, {
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
        });
      }
    }

    for (const video of externalSocialVideos) {
      const link = normalizeLink(video.video_url || video.link);
      if (link) {
        externalVideoMap.set(link, {
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
        });
      }
    }

    // YouTube: fonte única agora é o banco local (youtube_videos)
    for (const video of localYoutubeVideos) {
      const link = normalizeLink(video.video_url);
      if (link) {
        externalVideoMap.set(link, {
          views: Number(video.views_count || 0),
          likes: Number(video.likes_count || 0),
          comments: Number(video.comments_count || 0),
          shares: 0,
        });
      }
    }

    // Atualizar cada vídeo da campanha
    for (const campaignVideo of campaignVideos) {
      const normalizedLink = normalizeLink(campaignVideo.video_link);
      const externalData = externalVideoMap.get(normalizedLink);

      if (externalData) {
        const { error: updateError } = await supabase
          .from("campaign_videos")
          .update({
            views: externalData.views,
            likes: externalData.likes,
            comments: externalData.comments,
            shares: externalData.shares,
          })
          .eq("id", campaignVideo.id);

        if (updateError) {
          result.failed++;
          result.errors.push(`Erro ao atualizar ${campaignVideo.id}: ${updateError.message}`);
        } else {
          result.synced++;

          // Também salvar no histórico
          await supabase.from("video_metrics_history").upsert({
            video_id: campaignVideo.id,
            views: externalData.views,
            likes: externalData.likes,
            comments: externalData.comments,
            shares: externalData.shares,
            recorded_at: new Date().toISOString().split("T")[0],
          }, {
            onConflict: "video_id,recorded_at",
            ignoreDuplicates: false,
          });
        }
      } else {
        // Tentar buscar diretamente pelo link
        try {
          const videoData = await externalSupabase.getVideoByLink(campaignVideo.video_link);
          if (videoData) {
            const { error: updateError } = await supabase
              .from("campaign_videos")
              .update({
                views: videoData.views || 0,
                likes: videoData.likes || 0,
                comments: videoData.comments || 0,
                shares: videoData.shares || 0,
              })
              .eq("id", campaignVideo.id);

            if (!updateError) {
              result.synced++;
            } else {
              result.failed++;
            }
          }
        } catch {
          // Vídeo não encontrado no banco externo
        }
      }
    }
  } catch (err) {
    result.errors.push(`Erro geral: ${err}`);
  }

  return result;
}

/**
 * Normaliza um link de vídeo para comparação
 */
function normalizeLink(link: string | undefined | null): string {
  if (!link) return "";
  
  let normalized = link.trim().toLowerCase();
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");
  
  // Remove query params and fragments
  normalized = normalized.split("?")[0].split("#")[0];
  
  // Handle Instagram links
  if (normalized.includes("instagram.com")) {
    const match = normalized.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (match) {
      return `instagram:${match[1]}`;
    }
  }
  
  // Handle TikTok links
  if (normalized.includes("tiktok.com")) {
    const match = normalized.match(/\/video\/(\d+)/i);
    if (match) {
      return `tiktok:${match[1]}`;
    }
    const vmMatch = normalized.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/i);
    if (vmMatch) {
      return `tiktok:${vmMatch[1]}`;
    }
  }
  
  // Handle YouTube links
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = link.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
    if (watchMatch) {
      return `youtube:${watchMatch[1]}`;
    }
    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = normalized.match(/\/shorts\/([A-Za-z0-9_-]{11})/i);
    if (shortsMatch) {
      return `youtube:${shortsMatch[1]}`;
    }
    // youtu.be/VIDEO_ID
    const shortMatch = normalized.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
    if (shortMatch) {
      return `youtube:${shortMatch[1]}`;
    }
  }
  
  return normalized;
}

/**
 * Busca métricas agregadas usando externalSupabase (dados reais)
 */
export async function getAggregatedMetrics(campaignId: string) {
  // Buscar vídeos da campanha
  const { data: campaignVideos } = await supabase
    .from("campaign_videos")
    .select("video_link")
    .eq("campaign_id", campaignId);

  if (!campaignVideos || campaignVideos.length === 0) {
    return { total_views: 0, total_likes: 0, total_comments: 0, total_shares: 0 };
  }

  // Buscar dados externos (Instagram, TikTok e YouTube)
  const [externalVideos, externalSocialVideos, externalYoutubeVideos] = await Promise.all([
    externalSupabase.getAllVideos(),
    externalSupabase.getSocialVideos(),
    externalSupabase.getYoutubeVideos(),
  ]);

  // Criar mapa de métricas
  const metricsMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
  
  for (const video of [...externalVideos, ...externalSocialVideos, ...externalYoutubeVideos]) {
    const link = normalizeLink(video.link || video.video_url);
    if (link) {
      metricsMap.set(link, {
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0,
      });
    }
  }

  // Somar métricas dos vídeos da campanha
  let total_views = 0;
  let total_likes = 0;
  let total_comments = 0;
  let total_shares = 0;

  for (const campaignVideo of campaignVideos) {
    const normalized = normalizeLink(campaignVideo.video_link);
    const metrics = metricsMap.get(normalized);
    if (metrics) {
      total_views += metrics.views;
      total_likes += metrics.likes;
      total_comments += metrics.comments;
      total_shares += metrics.shares;
    }
  }

  return { total_views, total_likes, total_comments, total_shares };
}
