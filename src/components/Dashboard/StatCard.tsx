import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <Card className={`glass-card-hover p-6 ${className}`}>
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
        <div className="flex items-center gap-1">
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}
          </span>
          <span className="text-xs text-muted-foreground">vs. mês anterior</span>
        </div>
      )}
    </Card>
  );
}
