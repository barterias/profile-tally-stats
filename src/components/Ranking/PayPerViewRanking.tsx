import { DollarSign, Eye, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RankingItem } from "@/types/campaign";

interface PayPerViewRankingProps {
  ranking: RankingItem[];
  paymentRate: number;
  minViews?: number;
  maxPaidViews?: number;
  title?: string;
}

export function PayPerViewRanking({ 
  ranking, 
  paymentRate,
  minViews = 0,
  maxPaidViews = Infinity,
  title = "Ranking de Ganhos"
}: PayPerViewRankingProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateEarnings = (views: number) => {
    // Views below minimum don't count
    if (views < minViews) return 0;
    
    // Cap at max paid views
    const paidViews = Math.min(views, maxPaidViews);
    
    return (paidViews / 1000) * paymentRate;
  };

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum clipador no ranking ainda.</p>
      </div>
    );
  }

  // Sort by earnings
  const sortedRanking = [...ranking].sort((a, b) => 
    calculateEarnings(b.total_views) - calculateEarnings(a.total_views)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-400" />
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">
          R$ {paymentRate.toFixed(2)} / 1K views
        </span>
      </div>

      {minViews > 0 && (
        <p className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
          ⚠️ Mínimo de {formatNumber(minViews)} views para começar a ganhar
        </p>
      )}

      <div className="space-y-2">
        {sortedRanking.map((user, index) => {
          const earnings = calculateEarnings(user.total_views);
          const isAboveMinimum = user.total_views >= minViews;
          const isCapped = user.total_views > maxPaidViews;
          
          return (
            <div 
              key={user.user_id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                index === 0 
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40' 
                  : index === 1
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/40'
                  : index === 2
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40'
                  : 'bg-muted/20 border-border/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-green-500/30 text-green-400' :
                  index === 1 ? 'bg-blue-500/30 text-blue-400' :
                  index === 2 ? 'bg-purple-500/30 text-purple-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.username}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(user.total_views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {user.total_videos}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${isAboveMinimum ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(earnings)}
                </p>
                {!isAboveMinimum && (
                  <p className="text-xs text-yellow-400">Abaixo do mínimo</p>
                )}
                {isCapped && (
                  <p className="text-xs text-blue-400">Teto atingido</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
