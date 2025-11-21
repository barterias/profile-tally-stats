import { externalSupabase } from "./externalSupabase";

/**
 * Normaliza links de vídeo para comparação consistente
 */
export const normalizeLink = (link: string): string => {
  if (!link) return '';
  return link
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
};

/**
 * Extrai ID único do vídeo do link
 */
export const extractVideoId = (link: string): string | null => {
  if (!link) return null;
  
  // Instagram: /reel/CODE/ ou /reels/CODE/ ou /p/CODE/
  const instaMatch = link.match(/\/(reels?|p)\/([A-Za-z0-9_-]+)/);
  if (instaMatch) return instaMatch[2];
  
  // TikTok: /video/ID
  const tiktokMatch = link.match(/\/video\/(\d+)/);
  if (tiktokMatch) return tiktokMatch[1];
  
  return null;
};

/**
 * Busca métricas reais de um vídeo dado o link e plataforma
 */
export const getVideoMetrics = async (
  videoLink: string,
  platform: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
  thumbnail?: string;
} | null> => {
  const normalizedLink = normalizeLink(videoLink);

  try {
    if (platform === "instagram") {
      // Buscar todos os vídeos do Instagram
      const allInstagramVideos = await externalSupabase.getAllVideos();
      
      // Tentar match por link normalizado
      const match = allInstagramVideos?.find(v => {
        const dbLink = normalizeLink(v.link || v.video_url || '');
        return dbLink === normalizedLink || 
               dbLink.includes(normalizedLink) || 
               normalizedLink.includes(dbLink);
      });

      if (match) {
        return {
          views: match.views || 0,
          likes: match.likes || 0,
          comments: match.comments || 0,
          shares: match.shares || 0,
          thumbnail: match.thumbnail || match.post_image,
        };
      }
      
      // Fallback: tentar por ID
      const videoId = extractVideoId(videoLink);
      if (videoId) {
        const matchById = allInstagramVideos?.find(v => {
          const dbId = extractVideoId(v.link || v.video_url || '');
          return dbId === videoId;
        });
        
        if (matchById) {
          return {
            views: matchById.views || 0,
            likes: matchById.likes || 0,
            comments: matchById.comments || 0,
            shares: matchById.shares || 0,
            thumbnail: matchById.thumbnail || matchById.post_image,
          };
        }
      }
    } else if (platform === "tiktok") {
      // Buscar todos os vídeos do TikTok
      const allTikTokVideos = await externalSupabase.getSocialVideos();
      
      // Tentar match por link normalizado
      const match = allTikTokVideos?.find(v => {
        const dbLink = normalizeLink(v.link || v.video_url || '');
        return dbLink === normalizedLink || 
               dbLink.includes(normalizedLink) || 
               normalizedLink.includes(dbLink);
      });

      if (match) {
        return {
          views: match.views || 0,
          likes: match.likes || 0,
          comments: match.comments || 0,
          shares: match.shares || 0,
          thumbnail: match.thumbnail,
        };
      }
      
      // Fallback: tentar por ID
      const videoId = extractVideoId(videoLink);
      if (videoId) {
        const matchById = allTikTokVideos?.find(v => {
          const dbId = extractVideoId(v.link || v.video_url || '');
          return dbId === videoId;
        });
        
        if (matchById) {
          return {
            views: matchById.views || 0,
            likes: matchById.likes || 0,
            comments: matchById.comments || 0,
            shares: matchById.shares || 0,
            thumbnail: matchById.thumbnail,
          };
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar métricas do vídeo ${platform}:`, error);
  }

  return null;
};

/**
 * Busca métricas para múltiplos vídeos de forma otimizada
 * Faz cache dos dados externos para evitar múltiplas chamadas
 */
export const getMultipleVideoMetrics = async (
  videos: Array<{ video_link: string; platform: string }>
): Promise<Map<string, { views: number; likes: number; comments: number; shares: number; thumbnail?: string }>> => {
  const metricsMap = new Map();

  if (!videos || videos.length === 0) {
    return metricsMap;
  }

  // Buscar todos os vídeos de uma vez (cache)
  const [allInstagramVideos, allTikTokVideos] = await Promise.all([
    externalSupabase.getAllVideos(),
    externalSupabase.getSocialVideos(),
  ]);

  console.log("📱 Instagram DB total:", allInstagramVideos?.length || 0);
  console.log("🎵 TikTok DB total:", allTikTokVideos?.length || 0);

  // Processar cada vídeo
  for (const video of videos) {
    const normalizedLink = normalizeLink(video.video_link);
    
    if (video.platform === "instagram") {
      const match = allInstagramVideos?.find(v => {
        const dbLink = normalizeLink(v.link || v.video_url || '');
        return dbLink === normalizedLink || 
               dbLink.includes(normalizedLink) || 
               normalizedLink.includes(dbLink);
      });

      if (match) {
        metricsMap.set(video.video_link, {
          views: match.views || 0,
          likes: match.likes || 0,
          comments: match.comments || 0,
          shares: match.shares || 0,
          thumbnail: match.thumbnail || match.post_image,
        });
        console.log(`✅ Instagram encontrado! Link: ${video.video_link}, Views: ${match.views}`);
      } else {
        console.log(`❌ Instagram não encontrado: ${video.video_link}`);
      }
    } else if (video.platform === "tiktok") {
      const match = allTikTokVideos?.find(v => {
        const dbLink = normalizeLink(v.link || v.video_url || '');
        return dbLink === normalizedLink || 
               dbLink.includes(normalizedLink) || 
               normalizedLink.includes(dbLink);
      });

      if (match) {
        metricsMap.set(video.video_link, {
          views: match.views || 0,
          likes: match.likes || 0,
          comments: match.comments || 0,
          shares: match.shares || 0,
          thumbnail: match.thumbnail,
        });
        console.log(`✅ TikTok encontrado! Link: ${video.video_link}, Views: ${match.views}`);
      } else {
        console.log(`❌ TikTok não encontrado: ${video.video_link}`);
      }
    }
  }

  return metricsMap;
};
