import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankingItem } from "@/types/campaign";

interface CompetitionRankingProps {
  ranking: RankingItem[];
  prizeDistribution: { position: number; prize: number }[];
  title?: string;
}

export function CompetitionRanking({ 
  ranking, 
  prizeDistribution,
  title = "Ranking da Competição"
}: CompetitionRankingProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPrizeForPosition = (position: number) => {
    const prize = prizeDistribution.find(p => p.position === position);
    return prize?.prize || 0;
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{position}º</span>;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/40";
      default:
        return "bg-muted/20 border-border/30";
    }
  };

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum participante no ranking ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        {title}
      </h3>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[2, 1, 3].map((position) => {
          const user = ranking.find(r => r.rank_position === position);
          if (!user) return <div key={position} />;
          
          const prize = getPrizeForPosition(position);
          
          return (
            <div 
              key={position}
              className={`relative p-4 rounded-xl border ${getRankStyle(position)} ${
                position === 1 ? 'transform -translate-y-4' : ''
              }`}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                {getRankIcon(position)}
              </div>
              <div className="text-center pt-4">
                <Avatar className="h-16 w-16 mx-auto mb-2 border-2 border-primary/30">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold truncate">{user.username}</p>
                <p className="text-sm text-muted-foreground">{formatNumber(user.total_views)} views</p>
                {prize > 0 && (
                  <p className="text-sm font-bold text-green-400 mt-1">
                    {formatCurrency(prize)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of ranking */}
      <div className="space-y-2">
        {ranking.filter(r => r.rank_position > 3).map((user) => {
          const prize = getPrizeForPosition(user.rank_position);
          
          return (
            <div 
              key={user.user_id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-center font-semibold text-muted-foreground">
                  {user.rank_position}º
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.total_videos} vídeos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatNumber(user.total_views)} views</p>
                {prize > 0 && (
                  <p className="text-sm text-green-400">{formatCurrency(prize)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
