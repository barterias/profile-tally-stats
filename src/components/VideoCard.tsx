import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Share2, TrendingUp } from "lucide-react";

interface VideoCardProps {
  thumbnail: string;
  title: string;
  views: number;
  likes: number;
  shares: number;
  hashtag: string;
  trending?: boolean;
}

export const VideoCard = ({ 
  thumbnail, 
  title, 
  views, 
  likes, 
  shares, 
  hashtag,
  trending 
}: VideoCardProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="overflow-hidden bg-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {trending && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground gap-1">
            <TrendingUp className="w-3 h-3" />
            Trending
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
          <Badge variant="secondary" className="mb-2 text-xs">
            {hashtag}
          </Badge>
          <p className="text-sm font-medium line-clamp-2 text-foreground">{title}</p>
        </div>
      </div>
      <div className="p-3 grid grid-cols-3 gap-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-xs font-medium">{formatNumber(views)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Heart className="w-4 h-4" />
          <span className="text-xs font-medium">{formatNumber(likes)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-medium">{formatNumber(shares)}</span>
        </div>
      </div>
    </Card>
  );
};
