import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  timestamp?: string;
}

interface PendingItemsCardProps {
  title: string;
  icon: LucideIcon;
  items: PendingItem[];
  emptyMessage: string;
  onViewAll?: () => void;
  onItemClick?: (id: string) => void;
  maxHeight?: number;
}

export default function PendingItemsCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
  onViewAll,
  onItemClick,
  maxHeight = 300,
}: PendingItemsCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {items.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {items.length}
              </Badge>
            )}
          </div>
          {onViewAll && items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Ver todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <Icon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border border-border/50 bg-muted/30 transition-colors",
                    onItemClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onItemClick?.(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {item.badge && (
                        <Badge variant={item.badgeVariant || "secondary"}>
                          {item.badge}
                        </Badge>
                      )}
                      {item.timestamp && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
