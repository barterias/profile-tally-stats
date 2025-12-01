import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Download, ChevronRight } from "lucide-react";
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
}

export default function TopRankingCard({
  title,
  items,
  onExport,
  onViewAll,
}: TopRankingCardProps) {
  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case 1:
        return "bg-gray-300/20 text-gray-400 border-gray-400/30";
      case 2:
        return "bg-amber-600/20 text-amber-600 border-amber-600/30";
      default:
        return "bg-muted text-muted-foreground border-border";
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
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            )}
            {onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                Ver todos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum participante ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border",
                    getMedalColor(index)
                  )}
                >
                  {index + 1}
                </div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {item.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">@{item.username}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatViews(item.views)}</p>
                  <p className="text-xs text-muted-foreground">{item.videos} vídeos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
