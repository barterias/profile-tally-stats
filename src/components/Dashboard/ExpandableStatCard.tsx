import { useState } from "react";
import { LucideIcon, X } from "lucide-react";
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
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-500 ease-out",
        isExpanded ? "rounded-2xl" : "aspect-square",
        className
      )}
      onClick={handleToggle}
    >
      {/* Animated gradient border */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl p-[2px] overflow-hidden",
          "before:absolute before:inset-[-200%] before:animate-[spin_3s_linear_infinite]",
          "before:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(var(--primary))_120deg,hsl(160_80%_50%)_180deg,hsl(var(--primary))_240deg,transparent_300deg,transparent_360deg)]",
          "group-hover:before:animate-[spin_2s_linear_infinite]"
        )}
        style={{
          background: "transparent",
        }}
      >
        <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(160_80%_50%)_120deg,hsl(120_60%_45%)_180deg,hsl(160_80%_50%)_240deg,transparent_300deg,transparent_360deg)]" />
      </div>

      {/* Glow effect behind */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl blur-xl opacity-40 transition-opacity duration-500",
          "bg-gradient-to-r from-emerald-500/50 via-green-400/50 to-emerald-500/50",
          "group-hover:opacity-60"
        )}
      />

      {/* Inner content container */}
      <div
        className={cn(
          "relative h-full w-full rounded-2xl bg-card/95 backdrop-blur-sm border border-border/20",
          "transition-all duration-500 overflow-hidden group",
          isExpanded ? "p-6" : "flex items-center justify-center"
        )}
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

        {/* Collapsed State - Only Icon */}
        <div
          className={cn(
            "transition-all duration-300",
            isExpanded ? "hidden" : "flex items-center justify-center w-full h-full"
          )}
        >
          {/* Icon container with click animation */}
          <div className={cn(
            "relative z-10 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-150",
            "bg-gradient-to-br from-emerald-500/20 to-green-400/10",
            "shadow-[0_0_20px_rgba(52,211,153,0.4),0_0_40px_rgba(34,197,94,0.2)]",
            "group-hover:shadow-[0_0_30px_rgba(52,211,153,0.6),0_0_60px_rgba(34,197,94,0.3)]",
            isClicking && "scale-90 shadow-[0_0_40px_rgba(52,211,153,0.8),0_0_80px_rgba(34,197,94,0.5)]"
          )}>
            <Icon className="h-5 w-5 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
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
              "bg-gradient-to-br from-emerald-500/20 to-green-400/10",
              "shadow-[0_0_20px_rgba(52,211,153,0.4),0_0_40px_rgba(34,197,94,0.2)]"
            )}>
              <Icon className="h-6 w-6 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
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
      </div>
    </div>
  );
}
