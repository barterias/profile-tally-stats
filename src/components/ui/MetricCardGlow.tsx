import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { GlowCard } from "./GlowCard";

interface MetricCardGlowProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  glowColor?: 'primary' | 'green' | 'blue' | 'purple' | 'orange';
}

export function MetricCardGlow({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  glowColor = 'primary' 
}: MetricCardGlowProps) {
  const iconColors = {
    primary: 'text-primary bg-primary/15',
    green: 'text-green-400 bg-green-500/15',
    blue: 'text-blue-400 bg-blue-500/15',
    purple: 'text-purple-400 bg-purple-500/15',
    orange: 'text-orange-400 bg-orange-500/15',
  };

  return (
    <GlowCard glowColor={glowColor} className="relative overflow-hidden">
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
      {/* Decorative gradient */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
    </GlowCard>
  );
}
