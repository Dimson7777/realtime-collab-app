import { useOnlineStatus, ConnectionStatus } from "@/hooks/useOnlineStatus";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const map: Record<
  ConnectionStatus,
  { label: string; icon: typeof Cloud; tone: string }
> = {
  online: {
    label: "Online",
    icon: Cloud,
    tone: "bg-aurora/10 text-aurora ring-aurora/20",
  },
  reconnecting: {
    label: "Reconnecting…",
    icon: Loader2,
    tone: "bg-warning/10 text-warning ring-warning/20",
  },
  offline: {
    label: "Offline",
    icon: CloudOff,
    tone: "bg-destructive/10 text-destructive ring-destructive/20",
  },
};

export const ConnectionBadge = ({ className }: { className?: string }) => {
  const { status } = useOnlineStatus();
  const { label, icon: Icon, tone } = map[status];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors",
        tone,
        className
      )}
      title={`Connection status: ${label}`}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          status === "reconnecting" && "animate-spin",
          status === "online" && "animate-pulse-soft"
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
};
