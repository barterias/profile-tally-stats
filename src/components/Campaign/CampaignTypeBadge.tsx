import { Badge } from "@/components/ui/badge";
import { getCampaignTypeLabel, getCampaignTypeColor, CampaignType } from "@/types/campaign";
import { DollarSign, Trophy, Calendar, Flame } from "lucide-react";

interface CampaignTypeBadgeProps {
  type: CampaignType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CampaignTypeBadge({ type, showIcon = true, size = 'md' }: CampaignTypeBadgeProps) {
  const getIcon = () => {
    switch (type) {
      case 'pay_per_view':
        return <DollarSign className="h-3 w-3" />;
      case 'fixed':
        return <DollarSign className="h-3 w-3" />;
      case 'competition_daily':
        return <Flame className="h-3 w-3" />;
      case 'competition_monthly':
        return <Trophy className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getCampaignTypeColor(type)} ${sizeClasses[size]} flex items-center gap-1`}
    >
      {showIcon && getIcon()}
      {getCampaignTypeLabel(type)}
    </Badge>
  );
}
