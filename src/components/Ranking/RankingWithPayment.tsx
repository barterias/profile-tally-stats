import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Crown, 
  Medal, 
  Award, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Video,
  Wallet
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
}

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
  title = "Ranking",
  showPaymentActions = true,
}: RankingWithPaymentProps) {
  const [selectedUser, setSelectedUser] = useState<RankingItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return <span className="font-bold text-muted-foreground">{position}º</span>;
  };

  const getRankBg = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
    if (position === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
    if (position === 3) return "bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-500/30";
    return "bg-muted/20 border-border/30";
  };

  const handlePayClick = (item: RankingItem) => {
    setSelectedUser(item);
    setModalOpen(true);
  };

  const isPaid = (userId: string) => paidUsers.includes(userId);

  if (ranking.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum participante no ranking ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        {title}
      </h3>

      <div className="space-y-3">
        {ranking.map((item) => {
          const earnings = calculateEarnings(item);
          const userPaid = isPaid(item.user_id);
          
          return (
            <div
              key={item.user_id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRankBg(item.rank_position)}`}
            >
              {/* Rank */}
              <div className="w-12 flex justify-center">
                {getRankIcon(item.rank_position)}
              </div>

              {/* User */}
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarImage src={item.avatar_url} />
                <AvatarFallback>{item.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.username}</p>
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
              <div className="text-right">
                <p className="font-bold text-green-400 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(earnings)}
                </p>
                {campaignType === 'pay_per_view' && item.total_views < minViews && (
                  <span className="text-xs text-yellow-400">Abaixo do mínimo</span>
                )}
              </div>

              {/* Payment Status/Action */}
              {showPaymentActions && earnings > 0 && (
                <div className="ml-2">
                  {userPaid ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pago
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePayClick(item)}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <Wallet className="h-4 w-4 mr-1" />
                      Pagar
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
