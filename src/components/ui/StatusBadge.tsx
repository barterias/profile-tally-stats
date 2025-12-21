import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type StatusType = 'pending' | 'approved' | 'rejected' | 'paid' | 'active' | 'inactive' | 'requested';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  pending: { labelKey: 'badge.pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { labelKey: 'badge.approved', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { labelKey: 'badge.rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  paid: { labelKey: 'badge.paid', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  active: { labelKey: 'badge.active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  inactive: { labelKey: 'badge.inactive', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  requested: { labelKey: 'badge.requested', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useLanguage();
  
  const config = statusConfig[status.toLowerCase()] || { 
    labelKey: status, 
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
  };

  const label = statusConfig[status.toLowerCase()] ? t(config.labelKey) : status;

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {label}
    </span>
  );
}
