import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/externalSupabase";

export interface SocialVideo {
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
}

export const useSocialVideos = (platform?: "tiktok" | "instagram") => {
  return useQuery({
    queryKey: ["social-videos", platform],
    queryFn: async () => {
      // Helper para limpar prefixo "=" dos campos do TikTok
      const cleanTikTokText = (text?: string) => text?.startsWith('=') ? text.slice(1) : text;
      
      const cleanTikTokVideo = (video: SocialVideo): SocialVideo => {
        if (video.platform === 'tiktok') {
          return {
            ...video,
            video_id: cleanTikTokText(video.video_id),
            video_url: cleanTikTokText(video.video_url),
            title: cleanTikTokText(video.title),
            thumbnail: cleanTikTokText(video.thumbnail),
            music_id: cleanTikTokText(video.music_id),
            music_title: cleanTikTokText(video.music_title),
            music_author: cleanTikTokText(video.music_author),
            music_cover: cleanTikTokText(video.music_cover),
            music_url: cleanTikTokText(video.music_url),
            creator_id: cleanTikTokText(video.creator_id),
            creator_username: cleanTikTokText(video.creator_username),
            creator_nickname: cleanTikTokText(video.creator_nickname),
            creator_avatar: cleanTikTokText(video.creator_avatar),
            link: cleanTikTokText(video.link),
          };
        }
        return video;
      };
      
      // Instagram usa a tabela 'videos', TikTok usa 'social_videos'
      if (platform === "instagram") {
        const videos = await externalSupabase.getAllVideos();
        return videos.filter(v => v.platform === platform);
      } else if (platform === "tiktok") {
        const videos = await externalSupabase.getSocialVideos();
        return videos.filter(v => v.platform === platform).map(cleanTikTokVideo);
      }
      
      // Se não houver filtro, busca de ambas as tabelas
      const [instagramVideos, tiktokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);
      
      const cleanedTikTok = tiktokVideos.map(cleanTikTokVideo);
      
      return [...instagramVideos, ...cleanedTikTok].sort((a, b) => b.views - a.views);
    },
  });
};
