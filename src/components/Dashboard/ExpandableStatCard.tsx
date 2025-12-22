import { useState } from "react";
import { LucideIcon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExpandableStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  details?: React.ReactNode;
  className?: string;
}

export default function ExpandableStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  details,
  className = "",
}: ExpandableStatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const handleToggle = () => {
    setIsClicking(true);
    setTimeout(() => {
      setIsClicking(false);
      setIsExpanded(!isExpanded);
    }, 150);
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-500 ease-out overflow-hidden",
        "bg-card/60 backdrop-blur-sm border-border/30",
        isExpanded
          ? "p-6 rounded-2xl"
          : "p-0 rounded-full aspect-square flex items-center justify-center",
        className
      )}
      onClick={handleToggle}
    >
      {/* Close button when expanded */}
      {isExpanded && (
        <button
          className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsClicking(true);
            setTimeout(() => {
              setIsClicking(false);
              setIsExpanded(false);
            }, 150);
          }}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Collapsed State - Only Icon with Silver Glow */}
      <div
        className={cn(
          "transition-all duration-300",
          isExpanded ? "hidden" : "flex items-center justify-center w-full h-full group"
        )}
      >
        {/* Outer glow ring */}
        <div className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          "bg-gradient-to-br from-slate-300/10 via-white/5 to-slate-400/10",
          "shadow-[0_0_20px_rgba(203,213,225,0.3),0_0_40px_rgba(148,163,184,0.15),inset_0_0_20px_rgba(255,255,255,0.05)]",
          "group-hover:shadow-[0_0_30px_rgba(203,213,225,0.5),0_0_60px_rgba(148,163,184,0.25),inset_0_0_30px_rgba(255,255,255,0.1)]"
        )} />
        
        {/* Icon container with click animation */}
        <div className={cn(
          "relative z-10 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150",
          "bg-gradient-to-br from-slate-200/20 to-slate-400/10",
          "shadow-[0_0_15px_rgba(226,232,240,0.4),0_0_30px_rgba(148,163,184,0.2)]",
          "group-hover:shadow-[0_0_20px_rgba(226,232,240,0.6),0_0_40px_rgba(148,163,184,0.3)]",
          isClicking && "scale-90 shadow-[0_0_25px_rgba(226,232,240,0.8),0_0_50px_rgba(148,163,184,0.4)]"
        )}>
          <Icon className="h-5 w-5 text-slate-300 drop-shadow-[0_0_8px_rgba(226,232,240,0.6)]" />
        </div>
      </div>

      {/* Expanded State - Full Details */}
      <div
        className={cn(
          "transition-all duration-500",
          isExpanded ? "animate-fade-in" : "hidden"
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-glow-sm">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {/* Icon with glow in expanded state */}
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-slate-200/20 to-slate-400/10",
            "shadow-[0_0_15px_rgba(226,232,240,0.4),0_0_30px_rgba(148,163,184,0.2)]"
          )}>
            <Icon className="h-6 w-6 text-slate-300 drop-shadow-[0_0_8px_rgba(226,232,240,0.6)]" />
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1 mb-4">
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
            <span className="text-xs text-muted-foreground">vs. período anterior</span>
          </div>
        )}

        {/* Extra Details */}
        {details && (
          <div className="pt-4 border-t border-border/50">
            {details}
          </div>
        )}
      </div>
    </Card>
  );
}
