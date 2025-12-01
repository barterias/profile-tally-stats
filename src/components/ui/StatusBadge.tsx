import { cn } from "@/lib/utils";

type StatusType = 'pending' | 'approved' | 'rejected' | 'paid' | 'active' | 'inactive' | 'requested';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Rejeitado', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  paid: { label: 'Pago', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  active: { label: 'Ativo', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  inactive: { label: 'Inativo', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  requested: { label: 'Solicitado', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || { 
    label: status, 
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
