import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface RankingItem {
  creator: string;
  views: number;
  videos: number;
}

interface RankingTableProps {
  title: string;
  data: RankingItem[];
  period: "daily" | "monthly" | "overall";
}

export const RankingTable = ({ title, data, period }: RankingTableProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-warning" />;
      case 2:
        return <Medal className="w-6 h-6 text-muted-foreground" />;
      case 3:
        return <Award className="w-6 h-6 text-warning/60" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getPeriodColor = () => {
    switch(period) {
      case "daily": return "bg-primary/10 text-primary border-primary/20";
      case "monthly": return "bg-accent/10 text-accent border-accent/20";
      case "overall": return "bg-warning/10 text-warning border-warning/20";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card/95 to-card/80 border-border/40 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold">{title}</span>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                Top {data.length} clipadores por visualizações
              </p>
            </div>
          </CardTitle>
          <Badge className={`${getPeriodColor()} font-semibold px-3 py-1`}>
            {period === "daily" ? "Hoje" : period === "monthly" ? "Este Mês" : "Geral"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum dado disponível para este período</p>
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={`${item.creator}-${index}`}
              className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-all duration-200 group hover:scale-[1.02] animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50 group-hover:bg-primary/10 transition-colors">
                {getRankIcon(index + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                  {item.creator}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.videos} {item.videos === 1 ? "vídeo" : "vídeos"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {formatNumber(item.views)}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">views</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
