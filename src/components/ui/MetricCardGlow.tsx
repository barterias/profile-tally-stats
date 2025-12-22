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

  const iconColors = {
    primary: 'text-primary bg-primary/15',
    green: 'text-green-400 bg-green-500/15',
    blue: 'text-blue-400 bg-blue-500/15',
    purple: 'text-purple-400 bg-purple-500/15',
    orange: 'text-orange-400 bg-orange-500/15',
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <GlowCard 
      glowColor={glowColor} 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-500 ease-out",
        isExpanded 
          ? "rounded-2xl" 
          : "rounded-[50%] sm:rounded-2xl aspect-square sm:aspect-auto"
      )}
      onClick={handleToggle}
    >
      {/* Close button when expanded */}
      {isExpanded && (
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      {/* Collapsed State - Circle/Compact */}
      <div
        className={cn(
          "transition-all duration-500",
          isExpanded ? "hidden" : "flex flex-col items-center justify-center h-full text-center py-2"
        )}
      >
        <div className={cn("p-2.5 rounded-full mb-2", iconColors[glowColor])}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xl sm:text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 px-1">{title}</p>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] sm:text-xs font-medium mt-0.5",
            trend.isPositive ? "text-green-400" : "text-red-400"
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
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
          <div className={cn("p-3 rounded-xl", iconColors[glowColor])}>
            <Icon className="h-6 w-6" />
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
