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

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-500 ease-out overflow-hidden",
        "glass-card-hover hover:shadow-lg",
        isExpanded
          ? "p-6 rounded-2xl"
          : "p-4 rounded-[50%] sm:rounded-[40%] aspect-square sm:aspect-auto sm:p-6 sm:rounded-2xl",
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
            setIsExpanded(false);
          }}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Collapsed State - Circle/Compact */}
      <div
        className={cn(
          "transition-all duration-500",
          isExpanded ? "hidden" : "flex flex-col items-center justify-center h-full text-center"
        )}
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 neon-border">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-glow-sm">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{title}</p>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium mt-1",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center neon-border">
            <Icon className="h-6 w-6 text-primary" />
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
