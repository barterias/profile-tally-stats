import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "outline";
}

export function NeonButton({ 
  children, 
  icon: Icon, 
  variant = "primary",
  className,
  ...props 
}: NeonButtonProps) {
  return (
    <div className="relative group">
      {/* Animated gradient border */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg overflow-hidden",
          "before:absolute before:inset-[-200%] before:animate-[spin_3s_linear_infinite]",
          "before:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(0_0%_85%)_120deg,hsl(0_0%_100%)_180deg,hsl(0_0%_85%)_240deg,transparent_300deg,transparent_360deg)]"
        )}
      >
        <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(0_0%_80%)_120deg,hsl(0_0%_95%)_180deg,hsl(0_0%_80%)_240deg,transparent_300deg,transparent_360deg)]" />
      </div>

      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg blur-md opacity-30 transition-opacity duration-300",
          "bg-gradient-to-r from-slate-300/50 via-white/50 to-slate-300/50",
          "group-hover:opacity-50"
        )}
      />

      {/* Button content */}
      <button
        className={cn(
          "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium",
          "transition-all duration-200",
          "border border-transparent",
          variant === "primary" 
            ? "bg-card/95 text-foreground hover:bg-card" 
            : "bg-card/80 text-foreground hover:bg-card/95",
          "active:scale-95",
          className
        )}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 text-slate-300" />}
        <span>{children}</span>
      </button>
    </div>
  );
}
