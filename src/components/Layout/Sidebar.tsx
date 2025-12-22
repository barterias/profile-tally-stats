import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Upload,
  TrendingUp,
  Video,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import logo from "@/assets/logo-transparent.png";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isAdmin, isClient } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const clipperNavigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.campaigns"), href: "/campaigns", icon: Trophy },
    { name: t("nav.account_analytics"), href: "/account-analytics", icon: BarChart3 },
  ];

  const adminMainNavigation = [
    { name: t("nav.dashboard"), href: "/dashboard/admin", icon: LayoutDashboard },
    { name: t("nav.account_analytics"), href: "/account-analytics", icon: BarChart3 },
  ];

  const clientNavigation = [
    { name: t("nav.dashboard"), href: "/dashboard/client", icon: LayoutDashboard },
    { name: t("nav.campaigns"), href: "/client/campaigns", icon: Trophy },
    { name: t("nav.submit"), href: "/submit", icon: Upload },
    { name: t("nav.account_analytics"), href: "/account-analytics", icon: BarChart3 },
  ];

  const adminNavigation = [
    { name: t("nav.campaigns"), href: "/admin/campaigns", icon: Trophy },
    { name: t("nav.submissions"), href: "/admin/submissions", icon: Video },
    { name: t("nav.users"), href: "/admin/users", icon: Users },
    { name: t("nav.statistics"), href: "/admin/stats", icon: TrendingUp },
  ];

  const accountNavigation = [
    { name: t("nav.profile"), href: "/profile", icon: UserCircle },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path === "/dashboard/admin" && location.pathname === "/dashboard/admin") return true;
    if (path === "/dashboard/client" && location.pathname === "/dashboard/client") return true;
    if (path !== "/" && path !== "/dashboard/admin" && path !== "/dashboard/client") {
      return location.pathname.startsWith(path);
    }
    return false;
  };

  const NavItem = ({ item }: { item: typeof clipperNavigation[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    const content = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
          active
            ? "bg-gradient-to-r from-primary/20 to-accent/10 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", active && "text-primary")} />
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

  // Determine which navigation to show based on role
  const getUserNavigation = () => {
    if (isAdmin) {
      return adminMainNavigation;
    }
    if (isClient) {
      return clientNavigation;
    }
    return clipperNavigation;
  };

  const isActiveNav = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path === "/dashboard/admin" && location.pathname === "/dashboard/admin") return true;
    if (path !== "/" && path !== "/dashboard/admin") return location.pathname.startsWith(path);
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl border-r border-border/30 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-border/30",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link to={isAdmin ? "/dashboard/admin" : (isClient ? "/dashboard/client" : "/")} className="flex items-center gap-2">
            <div className="relative">
              <img src={logo} alt="ORDOJG" className="h-10 w-10 object-contain logo-glow" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                ORDOJG
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("h-8 w-8 hover:bg-primary/10", collapsed && "hidden")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            {/* User/Client Navigation */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-primary/70 uppercase tracking-wider mb-3">
                  {isClient && !isAdmin ? t("nav.client") : t("nav.menu")}
                </p>
              )}
              {getUserNavigation().map((item) => (
                <NavItem key={item.href + item.name} item={item} />
              ))}
            </div>

            {/* Admin Navigation - Only show if admin */}
            {isAdmin && (
              <div className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-xs font-semibold text-primary/70 uppercase tracking-wider mb-3">
                    {t("nav.administration")}
                  </p>
                )}
                {adminNavigation.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            )}

            {/* Account Navigation */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-primary/70 uppercase tracking-wider mb-3">
                  {t("nav.account")}
                </p>
              )}
              {accountNavigation.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Collapse Toggle */}
        {collapsed && (
          <div className="p-3 border-t border-border/30">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="w-full h-10 hover:bg-primary/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}