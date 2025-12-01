import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Upload,
  Wallet,
  TrendingUp,
  Shield,
  Video,
  Users,
  BarChart3,
  Medal,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const userNavigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.campaigns"), href: "/campaigns", icon: Trophy },
    { name: t("nav.submit"), href: "/submit", icon: Upload },
    { name: "Ranking Mensal", href: "/ranking/monthly", icon: Medal },
    { name: "Ranking Diário", href: "/ranking/daily", icon: TrendingUp },
    { name: t("nav.wallet"), href: "/wallet", icon: Wallet },
  ];

  const adminNavigation = [
    { name: "Painel Admin", href: "/admin", icon: Shield },
    { name: "Campanhas", href: "/admin/campaigns", icon: Trophy },
    { name: "Submissões", href: "/admin/submissions", icon: Video },
    { name: "Usuários", href: "/admin/users", icon: Users },
    { name: "Estatísticas", href: "/admin/stats", icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item }: { item: typeof userNavigation[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    const content = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          active
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary")} />
        {!collapsed && (
          <span className={cn("font-medium text-sm", active && "text-primary")}>
            {item.name}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card/50 backdrop-blur-xl border-r border-border/50 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-border/50",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <Zap className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 animate-pulse-glow">
                <Zap className="h-8 w-8 text-primary opacity-50" />
              </div>
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-glow-sm">CPL</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("h-8 w-8", collapsed && "hidden")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            {/* User Navigation */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Menu
                </p>
              )}
              {userNavigation.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>

            {/* Admin Navigation */}
            {isAdmin && (
              <div className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Administração
                  </p>
                )}
                {adminNavigation.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Collapse Toggle */}
        {collapsed && (
          <div className="p-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="w-full h-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
