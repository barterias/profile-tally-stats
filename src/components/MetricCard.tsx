import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  trend?: string;
}

export const MetricCard = ({ title, value, change, icon, trend }: MetricCardProps) => {
  return (
    <Card className="glass-card p-6 hover-glow neon-border group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold group-hover:text-glow transition-all">
            {value}
          </p>
          {trend && (
            <p className="text-sm text-muted-foreground">
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/20 group-hover:animate-pulse-glow">
          {icon}
        </div>
      </div>
    </Card>
  );
};
