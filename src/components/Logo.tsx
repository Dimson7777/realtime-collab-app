import { cn } from "@/lib/utils";

export const Logo = ({ className, showText = true }: { className?: string; showText?: boolean }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_1px_2px_hsl(14_82%_54%/0.25),inset_0_1px_0_hsl(0_0%_100%/0.20)]">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M16 6a6 6 0 1 0 0 12" />
        <path d="M8 18a6 6 0 1 0 0-12" />
      </svg>
    </div>
    {showText && (
      <span className="font-display text-[15px] font-semibold tracking-tight">
        Sync
      </span>
    )}
  </div>
);
