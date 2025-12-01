import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "destructive";
}

interface AdminStatsGridProps {
  stats: StatItem[];
}

export default function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case "success":
        return "border-success/30 bg-success/5";
      case "warning":
        return "border-warning/30 bg-warning/5";
      case "destructive":
        return "border-destructive/30 bg-destructive/5";
      default:
        return "border-border/50";
    }
  };

  const getIconClasses = (variant?: string) => {
    switch (variant) {
      case "success":
        return "bg-success/15 text-success";
      case "warning":
        return "bg-warning/15 text-warning";
      case "destructive":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-primary/15 text-primary";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={cn(
            "p-4 border transition-all hover:shadow-lg",
            getVariantClasses(stat.variant)
          )}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.trend && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    stat.trend.isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {stat.trend.isPositive ? "↑" : "↓"} {stat.trend.value}
                </p>
              )}
            </div>
            <div className={cn("p-3 rounded-xl", getIconClasses(stat.variant))}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
