import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { CampaignType } from "@/types/campaign";
import { DollarSign, Eye, Video, Trophy, Calculator, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_videos: number;
  total_views: number;
  total_likes?: number;
  rank_position: number;
  estimated_earnings?: number;
}

interface EarningsBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignType: CampaignType;
  paymentRate: number;
  prizePool: number;
  ranking: RankingItem[];
}

export function EarningsBreakdownModal({
  open,
  onOpenChange,
  campaignType,
  paymentRate,
  prizePool,
  ranking,
}: EarningsBreakdownModalProps) {
  const { t, language } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
      style: 'currency', 
      currency: language === 'pt' ? 'BRL' : 'USD' 
    }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCampaignTypeLabel = (type: CampaignType) => {
    switch (type) {
      case 'pay_per_view': return t('earnings_modal.pay_per_view');
      case 'fixed': return t('earnings_modal.fixed');
      case 'competition_daily': return t('earnings_modal.competition_daily');
      case 'competition_monthly': return t('earnings_modal.competition_monthly');
      default: return type;
    }
  };

  const getEarningsFormula = () => {
    const currencySymbol = language === 'pt' ? 'R$' : '$';
    
    switch (campaignType) {
      case 'pay_per_view':
        return {
          title: t('earnings_modal.pay_per_view'),
          formula: `(${t('earnings_modal.views')} ÷ 1,000) × ${currencySymbol} ${paymentRate.toFixed(2)}`,
          description: t('earnings_modal.ppv_description'),
          icon: Eye,
        };
      case 'competition_daily':
      case 'competition_monthly':
        return {
          title: getCampaignTypeLabel(campaignType),
          formula: `${t('earnings_modal.total_prize')}: ${formatCurrency(prizePool)}`,
          description: t('earnings_modal.competition_description'),
          icon: Trophy,
          distribution: [
            { position: 1, percentage: 50, amount: prizePool * 0.5 },
            { position: 2, percentage: 30, amount: prizePool * 0.3 },
            { position: 3, percentage: 20, amount: prizePool * 0.2 },
          ],
        };
      case 'fixed':
        return {
          title: t('earnings_modal.fixed'),
          formula: `${t('earnings_modal.videos')} × ${currencySymbol} ${paymentRate.toFixed(2)}`,
          description: t('earnings_modal.fixed_description'),
          icon: Video,
        };
      default:
        return {
          title: t('earnings_modal.earnings_calculation'),
          formula: t('earnings_modal.formula_not_defined'),
          description: t('earnings_modal.type_not_defined'),
          icon: Calculator,
        };
    }
  };

  const formulaInfo = getEarningsFormula();
  const FormulaIcon = formulaInfo.icon;

  const calculateEarnings = (item: RankingItem) => {
    switch (campaignType) {
      case 'pay_per_view':
        return (item.total_views / 1000) * paymentRate;
      case 'competition_daily':
      case 'competition_monthly':
        if (item.rank_position === 1) return prizePool * 0.5;
        if (item.rank_position === 2) return prizePool * 0.3;
        if (item.rank_position === 3) return prizePool * 0.2;
        return 0;
      case 'fixed':
        return item.total_videos * paymentRate;
      default:
        return 0;
    }
  };

  const totalDistributed = ranking.reduce((sum, item) => sum + calculateEarnings(item), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t('earnings_modal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('earnings_modal.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Formula Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <FormulaIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{formulaInfo.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{formulaInfo.description}</p>
                  <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border/30">
                    <code className="text-sm text-primary font-mono">{formulaInfo.formula}</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Prize Distribution for competitions */}
            {'distribution' in formulaInfo && formulaInfo.distribution && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  {t('earnings_modal.prize_distribution')}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {formulaInfo.distribution.map((d) => (
                    <div key={d.position} className="p-3 rounded-lg bg-background/50 text-center">
                      <div className="text-2xl mb-1">
                        {d.position === 1 ? '🥇' : d.position === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.percentage}%</div>
                      <div className="font-semibold text-green-400">{formatCurrency(d.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                {t('earnings_modal.earnings_per_clipper')}
              </h4>
              
              {ranking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('earnings_modal.no_clippers')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ranking.slice(0, 10).map((item) => {
                    const earnings = calculateEarnings(item);
                    const currencySymbol = language === 'pt' ? 'R$' : '$';
                    return (
                      <div
                        key={item.user_id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30"
                      >
                        <span className="w-6 text-center font-bold text-muted-foreground">
                          #{item.rank_position}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.avatar_url} />
                          <AvatarFallback>{item.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(item.total_views)} {t('earnings_modal.views')} • {item.total_videos} {t('earnings_modal.videos')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">{formatCurrency(earnings)}</p>
                          {campaignType === 'pay_per_view' && (
                            <p className="text-xs text-muted-foreground">
                              {(item.total_views / 1000).toFixed(1)}K × {currencySymbol}{paymentRate.toFixed(2)}
                            </p>
                          )}
                          {campaignType === 'fixed' && (
                            <p className="text-xs text-muted-foreground">
                              {item.total_videos} × {currencySymbol}{paymentRate.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="flex justify-between items-center">
                <span className="font-medium">{t('earnings_modal.total_to_distribute')}</span>
                <span className="text-xl font-bold text-green-400">{formatCurrency(totalDistributed)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
