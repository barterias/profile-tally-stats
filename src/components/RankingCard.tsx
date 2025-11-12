import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface RankingItem {
  rank: number;
  name: string;
  value: string;
  avatar?: string;
  change?: number;
}

interface RankingCardProps {
  title: string;
  items: RankingItem[];
}

export const RankingCard = ({ title, items }: RankingCardProps) => {
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
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.rank}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(item.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.value}</p>
            </div>
            {item.change !== undefined && (
              <Badge variant={item.change > 0 ? "default" : "secondary"} className="text-xs">
                {item.change > 0 ? "+" : ""}{item.change}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
