import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Medal, Trophy, Flame, TrendingUp, Award, Sparkles } from "lucide-react";
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

const MAX_RANKING_ITEMS = 15;

export function RankingList({ 
  ranking, 
  showEarnings = false, 
  title,
  emptyMessage,
  maxItems = MAX_RANKING_ITEMS
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
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />;
    if (position === 2) return <Medal className="h-5 w-5 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />;
    return <span className="text-sm font-bold text-muted-foreground">{position}º</span>;
  };

  const getRankBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.1)]';
    if (position === 2) return 'bg-gradient-to-r from-slate-400/20 via-gray-400/10 to-transparent border-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.1)]';
    if (position === 3) return 'bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'bg-muted/20 border-border/30 hover:border-primary/30';
  };

  const displayRanking = ranking.slice(0, Math.min(maxItems, MAX_RANKING_ITEMS));

  if (displayRanking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="relative inline-block">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-primary/50 animate-pulse" />
        </div>
        <p className="text-lg font-medium">{emptyMessage || t('ranking.empty_message')}</p>
        <p className="text-sm mt-1 opacity-70">{t('ranking.clippers_appear')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
            {title}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            Top {displayRanking.length}
          </span>
        </div>
      )}
      
      {displayRanking.map((item, index) => {
        const position = item.rank_position || index + 1;
        const isTop3 = position <= 3;
        
        return (
          <div 
            key={item.user_id} 
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.01] cursor-pointer",
              getRankBg(position)
            )}
          >
            <div className="flex items-center gap-4">
              {/* Position Badge */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                isTop3 ? "bg-background/80 ring-2" : "bg-muted/50",
                position === 1 && "ring-yellow-400/50",
                position === 2 && "ring-slate-400/50",
                position === 3 && "ring-amber-500/50"
              )}>
                {getRankIcon(position)}
              </div>
              
              {/* Avatar */}
              <Avatar className={cn(
                "border-2 ring-2 transition-all",
                isTop3 ? "h-12 w-12" : "h-11 w-11",
                position === 1 && "border-yellow-400/50 ring-yellow-400/20",
                position === 2 && "border-slate-400/50 ring-slate-400/20",
                position === 3 && "border-amber-500/50 ring-amber-500/20",
                !isTop3 && "border-border/50 ring-primary/10"
              )}>
                <AvatarImage src={item.avatar_url || undefined} />
                <AvatarFallback className={cn(
                  "font-semibold",
                  position === 1 && "bg-yellow-500/20 text-yellow-400",
                  position === 2 && "bg-slate-400/20 text-slate-300",
                  position === 3 && "bg-amber-500/20 text-amber-400",
                  !isTop3 && "bg-primary/10 text-primary"
                )}>
                  {item.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              {/* Info */}
              <div>
                <p className={cn(
                  "font-semibold",
                  isTop3 && "text-base"
                )}>{item.username}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  {item.total_videos} {t('ranking.videos_count')}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="text-right">
              <p className={cn(
                "font-bold text-primary flex items-center gap-1 justify-end",
                isTop3 ? "text-xl" : "text-lg"
              )}>
                <TrendingUp className="h-4 w-4" />
                {formatNumber(Number(item.total_views))}
              </p>
              <p className="text-xs text-muted-foreground">views</p>
              {showEarnings && item.estimated_earnings !== undefined && item.estimated_earnings > 0 && (
                <p className="text-sm font-bold text-green-400 mt-1 flex items-center gap-1 justify-end">
                  <Sparkles className="h-3 w-3" />
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
