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
    <Card className="overflow-hidden bg-gradient-to-br from-card via-card/95 to-card/80 border-border/40 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group">
      <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
        <img
          src={video.post_image || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"}
          alt="Thumbnail do vídeo"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        <Badge className="absolute top-4 right-4 bg-primary/95 backdrop-blur-md border-primary/20 shadow-lg text-primary-foreground font-semibold px-3 py-1">
          {video.platform}
        </Badge>
      </div>
      <CardContent className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-primary transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Views</span>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatNumber(video.views)}
            </p>
          </div>
          <div className="space-y-2 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-accent transition-colors">
              <div className="p-1.5 rounded-md bg-accent/10">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Likes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(video.likes)}
            </p>
          </div>
          <div className="space-y-2 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-success transition-colors">
              <div className="p-1.5 rounded-md bg-success/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Comments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(video.comments)}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary/70" />
            <span className="font-medium">Última atualização:</span>
            <span className="text-foreground/80">{formatDate(video.collected_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
