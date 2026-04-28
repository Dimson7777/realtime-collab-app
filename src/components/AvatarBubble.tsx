import { cn } from "@/lib/utils";

interface AvatarBubbleProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
}

export const AvatarBubble = ({ name, color, size = "md", className, showPulse }: AvatarBubbleProps) => {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-background",
          sizes[size],
        )}
        style={{ background: color }}
        title={name}
      >
        {initials || "?"}
      </div>
      {showPulse && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-aurora ring-2 ring-background" />
        </span>
      )}
    </div>
  );
};
