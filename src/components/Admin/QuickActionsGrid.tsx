import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning";
  badge?: number;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
}

export default function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case "primary":
        return "border-primary/30 hover:border-primary/50 hover:bg-primary/5";
      case "success":
        return "border-success/30 hover:border-success/50 hover:bg-success/5";
      case "warning":
        return "border-warning/30 hover:border-warning/50 hover:bg-warning/5";
      default:
        return "border-border/50 hover:border-primary/30 hover:bg-muted/50";
    }
  };

  const getIconClasses = (variant?: string) => {
    switch (variant) {
      case "primary":
        return "bg-primary/15 text-primary";
      case "success":
        return "bg-success/15 text-success";
      case "warning":
        return "bg-warning/15 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action, index) => (
        <Card
          key={index}
          className={cn(
            "p-4 cursor-pointer transition-all border relative",
            getVariantClasses(action.variant)
          )}
          onClick={action.onClick}
        >
          {action.badge !== undefined && action.badge > 0 && (
            <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
              {action.badge > 99 ? "99+" : action.badge}
            </div>
          )}
          <div className={cn("p-2 rounded-lg w-fit mb-3", getIconClasses(action.variant))}>
            <action.icon className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
        </Card>
      ))}
    </div>
  );
}
