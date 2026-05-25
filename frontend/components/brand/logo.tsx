import { cn } from "@/lib/utils";
import { Brain, Sparkles } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const sizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30",
          sizes[size]
        )}
      >
        <Brain className="h-[55%] w-[55%] text-white" />
        <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 text-amber-300" />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", textSizes[size])}>
          Study<span className="gradient-text">Mind</span>
          <span className="text-muted-foreground font-normal"> AI</span>
        </span>
      )}
    </div>
  );
}
