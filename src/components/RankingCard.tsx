import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface RankingCardProps {
  rank: number;
  name: string;
  views: string;
  avatar?: string;
  change?: number;
}

export const RankingCard = ({ rank, name, views, avatar, change }: RankingCardProps) => {
  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-warning" />;
      case 2:
        return <Medal className="w-5 h-5 text-muted-foreground" />;
      case 3:
        return <Award className="w-5 h-5 text-warning/60" />;
      default:
        return <span className="text-muted-foreground font-semibold">{rank}</span>;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
      <div className="flex items-center justify-center w-8">
        {getRankIcon(rank)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        <p className="text-sm text-muted-foreground">{views}</p>
      </div>
      {change !== undefined && (
        <Badge variant={change > 0 ? "default" : "secondary"} className="text-xs">
          {change > 0 ? "+" : ""}{change}
        </Badge>
      )}
    </div>
  );
};
