import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Sun className={cn("h-4 w-4 transition-all", theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute")} />
      <Moon className={cn("h-4 w-4 transition-all", theme === "light" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute")} />
    </button>
  );
};
