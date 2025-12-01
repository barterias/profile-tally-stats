import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignTypeBadge } from "./CampaignTypeBadge";
import { Campaign, CampaignType } from "@/types/campaign";
import { Calendar, Users, Eye, Video, Trophy, DollarSign, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
  stats?: {
    total_views: number;
    total_videos: number;
    total_clippers: number;
  };
  onClick?: () => void;
  selected?: boolean;
}

export function CampaignCard({ campaign, stats, onClick, selected }: CampaignCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPaymentInfo = () => {
    if (campaign.campaign_type === 'pay_per_view') {
      return `R$ ${campaign.payment_rate.toFixed(2)}/1K views`;
    }
    if (campaign.campaign_type === 'fixed') {
      return campaign.prize_description || 'Pagamento fixo';
    }
    if (campaign.campaign_type === 'competition_daily' || campaign.campaign_type === 'competition_monthly') {
      return campaign.prize_pool > 0 
        ? `Premiação: R$ ${campaign.prize_pool.toFixed(2)}`
        : campaign.prize_description || 'Competição';
    }
    return campaign.prize_description;
  };

  return (
    <Card 
      className={cn(
        "glass-card-hover cursor-pointer overflow-hidden transition-all duration-300",
        selected && "ring-2 ring-primary border-primary/50"
      )}
      onClick={onClick}
    >
      {/* Image Header */}
      {campaign.image_url ? (
        <div className="relative h-32 overflow-hidden">
          <img 
            src={campaign.image_url} 
            alt={campaign.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <Badge className={campaign.is_active ? 'bg-green-500/90 text-white' : 'bg-gray-500/90'}>
              {campaign.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            <CampaignTypeBadge type={campaign.campaign_type as CampaignType} size="sm" />
          </div>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Trophy className="h-10 w-10 text-primary/50" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <Badge className={campaign.is_active ? 'bg-green-500/90 text-white' : 'bg-gray-500/90'}>
              {campaign.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            <CampaignTypeBadge type={campaign.campaign_type as CampaignType} size="sm" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{campaign.description}</p>
          )}
        </div>

        {/* Payment Info */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-green-400">{getPaymentInfo()}</span>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{formatNumber(stats.total_views)}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.total_videos}</p>
              <p className="text-xs text-muted-foreground">Vídeos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.total_clippers}</p>
              <p className="text-xs text-muted-foreground">Clippers</p>
            </div>
          </div>
        )}

        {/* Platforms */}
        <div className="flex flex-wrap gap-1">
          {campaign.platforms?.map((platform) => (
            <Badge key={platform} variant="outline" className="text-xs">
              {platform}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
