import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MessageCircle, Calendar } from "lucide-react";
import { Video } from "@/lib/externalSupabase";

interface VideoMetricsCardProps {
  video: Video;
}

export const VideoMetricsCard = ({ video }: VideoMetricsCardProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-all duration-300">
      <div className="aspect-video w-full bg-muted relative">
        <img
          src={video.post_image || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"}
          alt="Thumbnail"
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm">
          {video.platform}
        </Badge>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Views</span>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatNumber(video.views)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">Likes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(video.likes)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Comments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(video.comments)}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Última atualização: {formatDate(video.collected_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
