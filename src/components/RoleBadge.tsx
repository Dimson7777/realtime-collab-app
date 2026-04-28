import { Crown, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomRole } from "@/hooks/useRoomRoles";

const META: Record<RoomRole, { label: string; icon: typeof Crown; tone: string }> = {
  owner: {
    label: "Owner",
    icon: Crown,
    tone: "bg-gradient-to-r from-primary/15 to-iris/15 text-primary ring-primary/20",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    tone: "bg-aurora/10 text-aurora ring-aurora/20",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    tone: "bg-muted text-muted-foreground ring-border",
  },
};

interface RoleBadgeProps {
  role: RoomRole;
  className?: string;
  /** Compact mode shows only the icon (used in tight spots like avatar overlays). */
  compact?: boolean;
}

export const RoleBadge = ({ role, className, compact }: RoleBadgeProps) => {
  const { label, icon: Icon, tone } = META[role];
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1",
        tone,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {!compact && label}
    </span>
  );
};
