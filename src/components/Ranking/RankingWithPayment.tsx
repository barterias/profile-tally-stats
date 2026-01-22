import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { 
  Crown, 
  Medal, 
  Award, 
  DollarSign, 
  CheckCircle2, 
  Eye, 
  Video,
  Wallet,
  Sparkles,
  TrendingUp,
  Flame
} from "lucide-react";
import { RankingItem, CampaignType } from "@/types/campaign";
import { PrizeConfig } from "@/hooks/useCompetitionPrizes";
import { PaymentConfirmModal } from "./PaymentConfirmModal";

interface RankingWithPaymentProps {
  ranking: RankingItem[];
  campaignId: string;
  campaignType: CampaignType;
  paymentRate: number;
  minViews?: number;
  maxPaidViews?: number;
  prizes?: PrizeConfig[];
  paidUsers?: string[];
  onPaymentComplete?: () => void;
  title?: string;
  showPaymentActions?: boolean;
  maxItems?: number;
}

const MAX_RANKING_ITEMS = 15;

export function RankingWithPayment({
  ranking,
  campaignId,
  campaignType,
  paymentRate,
  minViews = 0,
  maxPaidViews = Infinity,
  prizes = [],
  paidUsers = [],
  onPaymentComplete,
  title,
  showPaymentActions = true,
  maxItems = MAX_RANKING_ITEMS,
}: RankingWithPaymentProps) {
  const { t, language } = useLanguage();
  const [selectedUser, setSelectedUser] = useState<RankingItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paidUsersList, setPaidUsersList] = useState<string[]>(paidUsers);

  const displayRanking = ranking.slice(0, Math.min(maxItems, MAX_RANKING_ITEMS));

  useEffect(() => {
    const fetchPaidUsers = async () => {
      if (!campaignId) return;
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from('campaign_payment_records')
        .select('user_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'paid')
        .gte('period_date', `${currentMonth}-01`);
      
      if (data) {
        setPaidUsersList([...paidUsers, ...data.map(d => d.user_id)]);
      }
    };
    
    fetchPaidUsers();
  }, [campaignId, paidUsers]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
      style: 'currency', 
      currency: language === 'pt' ? 'BRL' : 'USD' 
    }).format(value);
  };

  const calculateEarnings = (item: RankingItem): number => {
    if (campaignType === 'pay_per_view') {
      const eligibleViews = Math.max(0, item.total_views - minViews);
      const paidViews = Math.min(eligibleViews, maxPaidViews - minViews);
      return (paidViews / 1000) * paymentRate;
    } else if (campaignType === 'competition_daily' || campaignType === 'competition_monthly') {
      const prize = prizes.find(p => p.position === item.rank_position);
      return prize?.prize_amount || 0;
    } else if (campaignType === 'fixed') {
      return item.total_videos * paymentRate;
    }
    return 0;
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />;
    if (position === 2) return <Medal className="h-5 w-5 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />;
    return <span className="font-bold text-muted-foreground">{position}º</span>;
  };

  const getRankBg = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.1)]";
    if (position === 2) return "bg-gradient-to-r from-slate-400/20 via-gray-400/10 to-transparent border-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.1)]";
    if (position === 3) return "bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
    return "bg-muted/20 border-border/30 hover:border-primary/30";
  };

  const handlePayClick = (item: RankingItem) => {
    setSelectedUser(item);
    setModalOpen(true);
  };

  const isPaid = (userId: string) => paidUsersList.includes(userId);

  if (displayRanking.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="relative inline-block">
          <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-primary/50 animate-pulse" />
        </div>
        <p className="text-lg font-medium">{t('noParticipants')}</p>
        <p className="text-sm mt-1 opacity-70">Os participantes aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          {title || t('ranking')}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          Top {displayRanking.length}
        </span>
      </div>

      <div className="space-y-3">
        {displayRanking.map((item) => {
          const earnings = calculateEarnings(item);
          const userPaid = isPaid(item.user_id);
          const isTop3 = item.rank_position <= 3;
          
          return (
            <div
              key={item.user_id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
                "hover:scale-[1.01]",
                getRankBg(item.rank_position)
              )}
            >
              {/* Rank */}
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                isTop3 ? "bg-background/80 ring-2" : "bg-muted/50",
                item.rank_position === 1 && "ring-yellow-400/50",
                item.rank_position === 2 && "ring-slate-400/50",
                item.rank_position === 3 && "ring-amber-500/50"
              )}>
                {getRankIcon(item.rank_position)}
              </div>

              {/* User */}
              <Avatar className={cn(
                "border-2 ring-2 transition-all",
                isTop3 ? "h-12 w-12" : "h-10 w-10",
                item.rank_position === 1 && "border-yellow-400/50 ring-yellow-400/20",
                item.rank_position === 2 && "border-slate-400/50 ring-slate-400/20",
                item.rank_position === 3 && "border-amber-500/50 ring-amber-500/20",
                !isTop3 && "border-primary/30 ring-primary/10"
              )}>
                <AvatarImage src={item.avatar_url} />
                <AvatarFallback className={cn(
                  "font-semibold",
                  item.rank_position === 1 && "bg-yellow-500/20 text-yellow-400",
                  item.rank_position === 2 && "bg-slate-400/20 text-slate-300",
                  item.rank_position === 3 && "bg-amber-500/20 text-amber-400",
                  !isTop3 && "bg-primary/10 text-primary"
                )}>
                  {item.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold truncate",
                  isTop3 && "text-base"
                )}>{item.username}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(item.total_views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {item.total_videos}
                  </span>
                </div>
              </div>

              {/* Earnings */}
              {earnings > 0 && (
                <div className={cn(
                  "text-right py-1 px-3 rounded-lg",
                  "bg-green-500/20 border border-green-500/30"
                )}>
                  <p className="font-bold text-green-400 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(earnings)}
                  </p>
                </div>
              )}

              {campaignType === 'pay_per_view' && item.total_views < minViews && (
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                  {t('belowMinimum')}
                </Badge>
              )}

              {/* Payment Status/Action */}
              {showPaymentActions && earnings > 0 && (
                <div className="ml-2">
                  {userPaid ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('paid')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePayClick(item)}
                      className="border-green-500/40 text-green-400 hover:bg-green-500/20 gap-1"
                    >
                      <Wallet className="h-4 w-4" />
                      {t('pay')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedUser && (
        <PaymentConfirmModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          user={selectedUser}
          amount={calculateEarnings(selectedUser)}
          campaignId={campaignId}
          onSuccess={() => {
            setModalOpen(false);
            setSelectedUser(null);
            onPaymentComplete?.();
          }}
        />
      )}
    </div>
  );
}