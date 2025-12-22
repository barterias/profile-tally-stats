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
          "before:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(160_80%_50%)_120deg,hsl(120_60%_45%)_180deg,hsl(160_80%_50%)_240deg,transparent_300deg,transparent_360deg)]"
        )}
      >
        <div className="absolute inset-[-200%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,hsl(160_80%_50%)_120deg,hsl(120_60%_45%)_180deg,hsl(160_80%_50%)_240deg,transparent_300deg,transparent_360deg)]" />
      </div>

      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg blur-md opacity-30 transition-opacity duration-300",
          "bg-gradient-to-r from-emerald-500/50 via-green-400/50 to-emerald-500/50",
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
        {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
        <span>{children}</span>
      </button>
    </div>
  );
}
