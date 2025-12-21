import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Medal, Trophy, Flame, TrendingUp } from "lucide-react";
import { RankingItem } from "@/types/campaign";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface RankingListProps {
  ranking: RankingItem[];
  showEarnings?: boolean;
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function RankingList({ 
  ranking, 
  showEarnings = false, 
  title,
  emptyMessage,
  maxItems = 10
}: RankingListProps) {
  const { t } = useLanguage();
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (position === 3) return <Medal className="h-5 w-5 text-orange-400" />;
    return <span className="text-sm font-bold text-muted-foreground">{position}º</span>;
  };

  const getRankBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    if (position === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (position === 3) return 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30';
    return 'bg-muted/20 border-border/30';
  };

  const displayRanking = ranking.slice(0, maxItems);

  if (displayRanking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">{emptyMessage || t('ranking.empty_message')}</p>
        <p className="text-sm mt-1">{t('ranking.clippers_appear')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </h3>
      )}
      {displayRanking.map((item, index) => {
        const position = item.rank_position || index + 1;
        return (
          <div 
            key={item.user_id} 
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer",
              getRankBg(position)
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50">
                {getRankIcon(position)}
              </div>
              <Avatar className="h-11 w-11 border-2 border-border/50 ring-2 ring-primary/20">
                <AvatarImage src={item.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {item.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{item.username}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {item.total_videos} {t('ranking.videos_count')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary flex items-center gap-1 justify-end">
                <TrendingUp className="h-4 w-4" />
                {formatNumber(Number(item.total_views))}
              </p>
              <p className="text-xs text-muted-foreground">views</p>
              {showEarnings && item.estimated_earnings !== undefined && (
                <p className="text-sm font-semibold text-green-400 mt-1">
                  {formatCurrency(item.estimated_earnings)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
