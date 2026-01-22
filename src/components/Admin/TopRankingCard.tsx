import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Download, ChevronRight, Crown, Medal, Award, TrendingUp, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankingItem {
  id: string;
  name: string;
  username: string;
  views: number;
  videos: number;
  avatar?: string;
}

interface TopRankingCardProps {
  title: string;
  items: RankingItem[];
  onExport?: () => void;
  onViewAll?: () => void;
  maxItems?: number;
}

const MAX_RANKING_ITEMS = 15;

export default function TopRankingCard({
  title,
  items,
  onExport,
  onViewAll,
  maxItems = MAX_RANKING_ITEMS,
}: TopRankingCardProps) {
  const displayItems = items.slice(0, Math.min(maxItems, MAX_RANKING_ITEMS));

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-4 w-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />;
      case 1:
        return <Medal className="h-4 w-4 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground">{position + 1}º</span>;
    }
  };

  const getRankBg = (position: number) => {
    switch (position) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/40";
      case 1:
        return "bg-gradient-to-r from-slate-400/20 via-gray-400/10 to-transparent border-slate-400/40";
      case 2:
        return "bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/40";
      default:
        return "bg-muted/30 border-border/50 hover:border-primary/30";
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Trophy className="h-4 w-4 text-primary drop-shadow-[0_0_6px_rgba(var(--primary),0.5)]" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="h-8">
                <Download className="h-3.5 w-3.5 mr-1" />
                CSV
              </Button>
            )}
            {onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll} className="h-8">
                Ver todos
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {displayItems.length === 0 ? (
          <div className="py-10 text-center">
            <div className="relative inline-block">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-primary/50 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Nenhum participante ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os primeiros a postar aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => {
              const isTop3 = index < 3;
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                    "hover:scale-[1.01]",
                    getRankBg(index)
                  )}
                >
                  {/* Position */}
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                    isTop3 ? "bg-background/80 ring-1" : "bg-muted/50",
                    index === 0 && "ring-yellow-400/50",
                    index === 1 && "ring-slate-400/50",
                    index === 2 && "ring-amber-500/50"
                  )}>
                    {getRankIcon(index)}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className={cn(
                    "border-2 ring-1 transition-all",
                    isTop3 ? "h-10 w-10" : "h-9 w-9",
                    index === 0 && "border-yellow-400/50 ring-yellow-400/20",
                    index === 1 && "border-slate-400/50 ring-slate-400/20",
                    index === 2 && "border-amber-500/50 ring-amber-500/20",
                    !isTop3 && "border-border/50 ring-primary/10"
                  )}>
                    <AvatarImage src={item.avatar} />
                    <AvatarFallback className={cn(
                      "text-sm font-semibold",
                      index === 0 && "bg-yellow-500/20 text-yellow-400",
                      index === 1 && "bg-slate-400/20 text-slate-300",
                      index === 2 && "bg-amber-500/20 text-amber-400",
                      !isTop3 && "bg-primary/10 text-primary"
                    )}>
                      {item.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">@{item.username}</p>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary flex items-center gap-1 justify-end">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {formatViews(item.views)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Flame className="h-3 w-3 text-orange-400" />
                      {item.videos} vídeos
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
