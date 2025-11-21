import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialVideo {
  id: string;
  platform: "tiktok" | "instagram";
  title: string;
  thumbnail: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  duration: number | null;
  creator_avatar: string | null;
  music_title: string | null;
  video_url: string;
  link: string;
  inserted_at: string;
  updated_at: string;
}

export const useSocialVideos = (platform?: "tiktok" | "instagram") => {
  return useQuery({
    queryKey: ["social-videos", platform],
    queryFn: async () => {
      let query = supabase
        .from("social_videos")
        .select("*")
        .order("views", { ascending: false });

      if (platform) {
        query = query.eq("platform", platform);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SocialVideo[];
    },
  });
};
