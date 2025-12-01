import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'green' | 'blue' | 'purple' | 'orange';
  hover?: boolean;
}

export function GlowCard({ children, className, glowColor = 'primary', hover = true }: GlowCardProps) {
  const glowClasses = {
    primary: 'shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]',
    green: 'shadow-[0_0_30px_rgba(34,197,94,0.15)] hover:shadow-[0_0_40px_rgba(34,197,94,0.25)]',
    blue: 'shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:shadow-[0_0_40px_rgba(59,130,246,0.25)]',
    purple: 'shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]',
    orange: 'shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:shadow-[0_0_40px_rgba(249,115,22,0.25)]',
  };

  return (
    <div 
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all duration-300",
        hover && glowClasses[glowColor],
        className
      )}
    >
      {children}
    </div>
  );
}
