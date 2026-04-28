import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, Loader2, X, ChevronDown, Crown, Pencil, Eye, UserMinus } from "lucide-react";
import { MembersSkeleton } from "@/components/skeletons/Skeletons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AvatarBubble } from "@/components/AvatarBubble";
import { RoleBadge } from "@/components/RoleBadge";
import { useRoomRoles, type RoomRole } from "@/hooks/useRoomRoles";
import { useAuth } from "@/hooks/useAuth";

interface MembersPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  /** user_ids currently present in the room (for live online indicator) */
  onlineIds?: Set<string>;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_color: string;
}

const ROLE_OPTIONS: { value: RoomRole; label: string; desc: string; icon: typeof Crown }[] = [
  { value: "editor", label: "Editor", desc: "Can edit document, notes, chat", icon: Pencil },
  { value: "viewer", label: "Viewer", desc: "Read-only access", icon: Eye },
];

export const MembersPanel = ({ open, onClose, roomId, onlineIds }: MembersPanelProps) => {
  const { user } = useAuth();
  const { roles, isOwner, setRole, removeMember, loading } = useRoomRoles(roomId);
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map());
  const [busyUser, setBusyUser] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const ids = Array.from(roles.keys());
    if (ids.length === 0) {
      setProfiles(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_color")
        .in("user_id", ids);
      if (cancelled) return;
      const map = new Map<string, ProfileRow>();
      ((data || []) as ProfileRow[]).forEach((p) => map.set(p.user_id, p));
      setProfiles(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, roles]);

  const handleSetRole = async (uid: string, role: RoomRole) => {
    setBusyUser(uid);
    const { error } = await setRole(uid, role);
    setBusyUser(null);
    if (error) toast.error("Couldn't update role");
    else toast.success(`Role updated to ${role}`);
  };

  const handleRemove = async (uid: string) => {
    setBusyUser(uid);
    const { error } = await removeMember(uid);
    setBusyUser(null);
    if (error) toast.error("Couldn't remove member");
    else toast.success("Member removed");
  };

  // Sort: owner first, then editors, then viewers, alphabetical inside groups
  const sorted = Array.from(roles.entries()).sort(([aId, aR], [bId, bR]) => {
    const order: Record<RoomRole, number> = { owner: 0, editor: 1, viewer: 2 };
    if (order[aR] !== order[bR]) return order[aR] - order[bR];
    const an = profiles.get(aId)?.display_name || "";
    const bn = profiles.get(bId)?.display_name || "";
    return an.localeCompare(bn);
  });

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-full max-w-sm flex-col border-l border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Members</h3>
              <p className="text-[11px] text-muted-foreground">
                {roles.size} {roles.size === 1 ? "person" : "people"}
                {!isOwner && " · view only"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <ScrollArea className="flex-1">
          {loading ? (
            <MembersSkeleton />
          ) : sorted.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center gap-3 px-6 text-center animate-fade-in">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Just you so far</p>
              <p className="text-xs text-muted-foreground -mt-1.5 max-w-[220px]">
                Share the room link — anyone who joins will appear here as a Viewer.
              </p>
            </div>
          ) : (
            <ul className="px-2 py-3 space-y-1">
              {sorted.map(([uid, role]) => {
                const p = profiles.get(uid);
                const name = p?.display_name || "Member";
                const color = p?.avatar_color || "#94a3b8";
                const isMe = uid === user?.id;
                const canModify = isOwner && role !== "owner";
                const isOnline = onlineIds?.has(uid) ?? false;
                return (
                  <li
                    key={uid}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40"
                  >
                    <div className="relative">
                      <AvatarBubble name={name} color={color} size="sm" />
                      {isOnline && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 inline-flex h-2 w-2 rounded-full bg-aurora ring-2 ring-card"
                          aria-label="Online now"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {name}
                          {isMe && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <RoleBadge role={role} />
                        {isOnline && !isMe && (
                          <span className="text-[10px] font-medium text-aurora">Online</span>
                        )}
                      </div>
                    </div>

                    {canModify ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={busyUser === uid}
                          >
                            {busyUser === uid ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                Change
                                <ChevronDown className="ml-0.5 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {ROLE_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt.value}
                              onClick={() => handleSetRole(uid, opt.value)}
                              disabled={role === opt.value}
                            >
                              <opt.icon className="mr-2 h-3.5 w-3.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold">{opt.label}</p>
                                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                              </div>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemove(uid)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="mr-2 h-3.5 w-3.5" />
                            Remove from room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border/60 px-4 py-3 text-[11px] text-muted-foreground">
          {isOwner ? (
            <>Anyone with the link joins as a <span className="font-semibold">Viewer</span>. Promote them here.</>
          ) : (
            <>Only the room owner can change roles.</>
          )}
        </div>
      </aside>
    </>
  );
};
