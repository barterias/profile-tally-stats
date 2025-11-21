import { Skeleton } from "@/components/ui/skeleton";
import { SocialVideoCard } from "./SocialVideoCard";
import { useSocialVideos } from "@/hooks/useSocialVideos";
import { VideoIcon } from "lucide-react";

interface SocialVideosListProps {
  platform: "tiktok" | "instagram";
}

export const SocialVideosList = ({ platform }: SocialVideosListProps) => {
  const { data: videos, isLoading } = useSocialVideos(platform);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4 animate-pulse">
            <Skeleton className="w-full aspect-video rounded-2xl" />
            <Skeleton className="w-3/4 h-6 rounded-lg" />
            <Skeleton className="w-full h-24 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <VideoIcon className="w-16 h-16 text-primary" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-2xl font-bold text-foreground">
            Nenhum vídeo encontrado
          </h3>
          <p className="text-muted-foreground">
            Ainda não há vídeos do {platform === "tiktok" ? "TikTok" : "Instagram"} no sistema. 
            Adicione um link de vídeo para começar a análise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <SocialVideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};
