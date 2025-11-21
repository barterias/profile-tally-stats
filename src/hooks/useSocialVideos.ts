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
      const videos = await externalSupabase.getAllVideos();
      
      if (platform) {
        return videos.filter(v => v.platform === platform);
      }
      
      return videos;
    },
  });
};
