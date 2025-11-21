import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/externalSupabase";

export interface SocialVideo {
  id: number;
  platform: string;
  link: string;
  views: number;
  likes: number;
  comments: number;
  post_image: string;
  video_url: string;
  collected_at: string;
}

export const useSocialVideos = (platform?: "tiktok" | "instagram") => {
  return useQuery({
    queryKey: ["social-videos", platform],
    queryFn: async () => {
      // Instagram usa a tabela 'videos', TikTok usa 'social_videos'
      if (platform === "instagram") {
        const videos = await externalSupabase.getAllVideos();
        return videos.filter(v => v.platform === platform);
      } else if (platform === "tiktok") {
        const videos = await externalSupabase.getSocialVideos();
        return videos.filter(v => v.platform === platform);
      }
      
      // Se não houver filtro, busca de ambas as tabelas
      const [instagramVideos, tiktokVideos] = await Promise.all([
        externalSupabase.getAllVideos(),
        externalSupabase.getSocialVideos(),
      ]);
      
      return [...instagramVideos, ...tiktokVideos].sort((a, b) => b.views - a.views);
    },
  });
};
