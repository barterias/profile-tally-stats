import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MessageCircle, Share2, Clock, Music } from "lucide-react";
import { SocialVideo } from "@/hooks/useSocialVideos";

interface SocialVideoCardProps {
  video: SocialVideo;
}

export const SocialVideoCard = ({ video }: SocialVideoCardProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          src={video.thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        <Badge className="absolute top-4 right-4 bg-primary/95 backdrop-blur-md border-primary/20 shadow-lg text-primary-foreground font-semibold px-3 py-1 uppercase">
          {video.platform}
        </Badge>
        {video.duration && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md text-white text-xs font-medium">
            <Clock className="w-3 h-3" />
            {formatDuration(video.duration)}
          </div>
        )}
      </div>
      <CardContent className="p-6 space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
            {video.title}
          </h3>
          {video.music_title && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Music className="w-3 h-3" />
              <span className="line-clamp-1">{video.music_title}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-primary transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Views</span>
            </div>
            <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatNumber(video.views)}
            </p>
          </div>
          
          <div className="space-y-1.5 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-accent transition-colors">
              <div className="p-1.5 rounded-md bg-accent/10">
                <Heart className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Likes</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatNumber(video.likes)}
            </p>
          </div>
          
          <div className="space-y-1.5 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-success transition-colors">
              <div className="p-1.5 rounded-md bg-success/10">
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Comments</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatNumber(video.comments)}
            </p>
          </div>
          
          <div className="space-y-1.5 group/metric">
            <div className="flex items-center gap-2 text-muted-foreground group-hover/metric:text-warning transition-colors">
              <div className="p-1.5 rounded-md bg-warning/10">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">Shares</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatNumber(video.shares)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/30 text-xs text-muted-foreground">
          <span>Adicionado: {formatDate(video.inserted_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
