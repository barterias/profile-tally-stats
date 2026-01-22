import { useState } from "react";
import { Trophy, Medal, Award, Crown, Video, Eye, Flame, TrendingUp, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingItem } from "@/types/campaign";
import { cn } from "@/lib/utils";

interface CompetitionRankingProps {
  ranking: RankingItem[];
  prizeDistribution: { position: number; prize: number }[];
  title?: string;
  maxItems?: number;
}

const MAX_RANKING_ITEMS = 15;

export function CompetitionRanking({ 
  ranking, 
  prizeDistribution,
  title = "Ranking da Competição",
  maxItems = MAX_RANKING_ITEMS
}: CompetitionRankingProps) {
  const [rankingType, setRankingType] = useState<"views" | "videos">("views");

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
        return <Crown className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
      case 2:
        return <Medal className="h-6 w-6 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{position}º</span>;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-yellow-500/10 border-yellow-500/40 shadow-[0_0_20px_rgba(250,204,21,0.15)]";
      case 2:
        return "bg-gradient-to-r from-slate-400/20 via-gray-400/15 to-slate-400/10 border-slate-400/40 shadow-[0_0_20px_rgba(148,163,184,0.15)]";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 via-orange-500/15 to-amber-600/10 border-amber-600/40 shadow-[0_0_20px_rgba(217,119,6,0.15)]";
      default:
        return "bg-muted/20 border-border/30 hover:border-primary/30";
    }
  };

  // Sort by views for views ranking
  const rankingByViews = [...ranking].sort((a, b) => (b.total_views || 0) - (a.total_views || 0));
  
  // Sort by video count for videos ranking
  const rankingByVideos = [...ranking].sort((a, b) => (b.total_videos || 0) - (a.total_videos || 0));

  const currentRanking = rankingType === "views" ? rankingByViews : rankingByVideos;
  const rankedList = currentRanking
    .slice(0, Math.min(maxItems, MAX_RANKING_ITEMS))
    .map((item, idx) => ({ ...item, rank_position: idx + 1 }));

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="relative inline-block">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <Sparkles className="h-6 w-6 absolute -top-1 -right-1 text-primary/50 animate-pulse" />
        </div>
        <p className="text-lg font-medium">Nenhum participante no ranking ainda.</p>
        <p className="text-sm mt-1 opacity-70">Os primeiros a postar aparecerão aqui</p>
      </div>
    );
  }

  const renderPodium = (list: (RankingItem & { rank_position: number })[]) => {
    const podiumOrder = [2, 1, 3];
    const podiumUsers = podiumOrder.map(pos => list.find(r => r.rank_position === pos)).filter(Boolean);
    
    if (podiumUsers.length < 3) return null;
    
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {podiumOrder.map((position, idx) => {
          const user = list.find(r => r.rank_position === position);
          if (!user) return <div key={position} />;
          
          const prize = rankingType === "views" ? getPrizeForPosition(position) : 0;
          const metric = rankingType === "views" ? user.total_views : user.total_videos;
          const label = rankingType === "views" ? "views" : "vídeos";
          const isFirst = position === 1;
          
          return (
            <div 
              key={position}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02]",
                getRankStyle(position),
                isFirst && "transform -translate-y-3 scale-[1.02]"
              )}
            >
              {/* Rank Badge */}
              <div className={cn(
                "absolute -top-4 left-1/2 transform -translate-x-1/2 p-2 rounded-full",
                position === 1 && "bg-yellow-500/30 ring-2 ring-yellow-400/50",
                position === 2 && "bg-slate-400/30 ring-2 ring-slate-400/50",
                position === 3 && "bg-amber-500/30 ring-2 ring-amber-500/50"
              )}>
                {getRankIcon(position)}
              </div>
              
              <div className="text-center pt-6">
                <Avatar className={cn(
                  "mx-auto mb-3 border-2 ring-2 transition-all",
                  isFirst ? "h-20 w-20" : "h-16 w-16",
                  position === 1 && "border-yellow-400/50 ring-yellow-400/30",
                  position === 2 && "border-slate-400/50 ring-slate-400/30",
                  position === 3 && "border-amber-500/50 ring-amber-500/30"
                )}>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className={cn(
                    "font-bold text-lg",
                    position === 1 && "bg-yellow-500/20 text-yellow-400",
                    position === 2 && "bg-slate-400/20 text-slate-300",
                    position === 3 && "bg-amber-500/20 text-amber-400"
                  )}>
                    {user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <p className={cn(
                  "font-bold truncate mb-1",
                  isFirst ? "text-base" : "text-sm"
                )}>
                  {user.username}
                </p>
                
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                  {rankingType === "views" ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  <span className="font-semibold">{formatNumber(metric || 0)}</span>
                  <span className="text-xs">{label}</span>
                </div>
                
                {prize > 0 && (
                  <div className={cn(
                    "mt-2 py-1 px-3 rounded-full inline-flex items-center gap-1",
                    "bg-green-500/20 border border-green-500/30"
                  )}>
                    <Sparkles className="h-3 w-3 text-green-400" />
                    <span className="text-sm font-bold text-green-400">
                      {formatCurrency(prize)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = (list: (RankingItem & { rank_position: number })[]) => (
    <div className="space-y-2">
      {list.filter(r => r.rank_position > 3).map((user) => {
        const prize = rankingType === "views" ? getPrizeForPosition(user.rank_position) : 0;
        const metric = rankingType === "views" ? user.total_views : user.total_videos;
        const label = rankingType === "views" ? "views" : "vídeos";
        
        return (
          <div 
            key={user.user_id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl border transition-all duration-200",
              "hover:bg-muted/30 hover:border-primary/30 hover:scale-[1.01]",
              getRankStyle(user.rank_position)
            )}
          >
            {/* Position */}
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center font-bold text-sm border border-border/50">
              {user.rank_position}º
            </div>
            
            {/* Avatar */}
            <Avatar className="h-10 w-10 border-2 border-primary/20 ring-1 ring-primary/10">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  {user.total_videos} vídeos
                </span>
                {rankingType === "videos" && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(user.total_views || 0)} views
                  </span>
                )}
              </p>
            </div>
            
            {/* Metric */}
            <div className="text-right">
              <p className="font-bold text-primary flex items-center gap-1 justify-end">
                <TrendingUp className="h-4 w-4" />
                {formatNumber(metric || 0)}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            
            {/* Prize */}
            {prize > 0 && (
              <div className="ml-2 py-1 px-2 rounded-lg bg-green-500/20 border border-green-500/30">
                <span className="text-sm font-bold text-green-400">{formatCurrency(prize)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          {title}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          Top {rankedList.length}
        </span>
      </div>

      <Tabs value={rankingType} onValueChange={(v) => setRankingType(v as "views" | "videos")}>
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 border border-border/50">
          <TabsTrigger 
            value="views" 
            className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            <Eye className="h-4 w-4" />
            Por Views
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
          >
            <Video className="h-4 w-4" />
            Por Vídeos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="space-y-4">
          {renderPodium(rankedList)}
          {renderList(rankedList)}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {renderPodium(rankedList)}
          {renderList(rankedList)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
