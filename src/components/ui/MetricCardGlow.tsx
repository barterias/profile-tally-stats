import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardGlowProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  className?: string;
  // Kept for backward compatibility, but now uses unified silver glow
  glowColor?: 'primary' | 'green' | 'blue' | 'purple' | 'orange';
  details?: React.ReactNode;
}

export function MetricCardGlow({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  glowColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  details
}: MetricCardGlowProps) {
  return (
    <div 
      className={cn(
        // Base card styles - rectangular with slight rounding
        "relative rounded-xl p-5 transition-all duration-300",
        // Dark background matching theme
        "bg-card/80 backdrop-blur-sm border border-border/40",
        // Silver/white glow effect around the card
        "shadow-[0_0_20px_rgba(226,232,240,0.08),0_0_40px_rgba(148,163,184,0.05)]",
        // Hover state with enhanced glow
        "hover:shadow-[0_0_25px_rgba(226,232,240,0.15),0_0_50px_rgba(148,163,184,0.1)]",
        "hover:border-border/60",
        className
      )}
    >
      {/* Subtle inner glow gradient */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-300/[0.03] via-transparent to-slate-400/[0.02] pointer-events-none" />
      
      <div className="relative flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title - small, muted */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          
          {/* Value - large, prominent */}
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          
          {/* Trend indicator */}
          {trend && trend.value !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
          
          {/* Optional subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {/* Icon container with silver glow */}
        <div className={cn(
          "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
          // Silver/white gradient background
          "bg-gradient-to-br from-slate-200/15 to-slate-400/10",
          // Subtle silver glow around icon container
          "shadow-[0_0_12px_rgba(226,232,240,0.2),0_0_24px_rgba(148,163,184,0.1)]"
        )}>
          <Icon className="h-5 w-5 text-slate-300 drop-shadow-[0_0_6px_rgba(226,232,240,0.4)]" />
        </div>
      </div>
    </div>
  );
}
