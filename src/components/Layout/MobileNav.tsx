import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Upload,
  Shield,
  User,
  BarChart3,
} from "lucide-react";

export default function MobileNav() {
  const { isAdmin, isClient } = useAuth();
  const location = useLocation();

  const getNavigation = () => {
    if (isClient && !isAdmin) {
      return [
        { name: "Dashboard", href: "/dashboard/client", icon: LayoutDashboard },
        { name: "Campanhas", href: "/client/campaigns", icon: Trophy },
        { name: "Analytics", href: "/account-analytics", icon: BarChart3 },
        { name: "Perfil", href: "/profile", icon: User },
      ];
    }
    
    return [
      { name: "Home", href: "/", icon: LayoutDashboard },
      { name: "Campanhas", href: "/campaigns", icon: Trophy },
      { name: "Enviar", href: "/submit", icon: Upload },
      ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: Shield }] : []),
      { name: "Perfil", href: "/profile", icon: User },
    ];
  };

  const navigation = getNavigation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all",
                active && "bg-primary/15"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
