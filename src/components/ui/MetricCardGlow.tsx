import { useState } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, X } from "lucide-react";
import { GlowCard } from "./GlowCard";

interface MetricCardGlowProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  glowColor?: 'primary' | 'green' | 'blue' | 'purple' | 'orange';
  details?: React.ReactNode;
}

export function MetricCardGlow({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  glowColor = 'primary',
  details
}: MetricCardGlowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const iconColors = {
    primary: 'text-primary bg-primary/15',
    green: 'text-green-400 bg-green-500/15',
    blue: 'text-blue-400 bg-blue-500/15',
    purple: 'text-purple-400 bg-purple-500/15',
    orange: 'text-orange-400 bg-orange-500/15',
  };

  const handleToggle = () => {
    setIsClicking(true);
    setTimeout(() => {
      setIsClicking(false);
      setIsExpanded(!isExpanded);
    }, 150);
  };

  return (
    <GlowCard 
      glowColor={glowColor} 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-500 ease-out",
        "bg-card/60 backdrop-blur-sm",
        isExpanded 
          ? "rounded-2xl p-6" 
          : "rounded-full aspect-square p-0 flex items-center justify-center"
      )}
      onClick={handleToggle}
    >
      {/* Close button when expanded */}
      {isExpanded && (
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsClicking(true);
            setTimeout(() => {
              setIsClicking(false);
              setIsExpanded(false);
            }, 150);
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
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
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.isPositive ? "text-green-400" : "text-red-400"
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
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

        {/* Extra Details */}
        {details && (
          <div className="pt-4 mt-4 border-t border-border/50">
            {details}
          </div>
        )}
      </div>

      {/* Decorative gradient - only show when expanded */}
      {isExpanded && (
        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
      )}
    </GlowCard>
  );
}
