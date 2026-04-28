import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Plus, ChevronsLeft, ChevronsRight, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface RoomRow {
  id: string;
  name: string;
  owner_id: string;
  updated_at: string;
}

interface RoomSidebarProps {
  currentRoomId: string;
  collapsed: boolean;
  onToggle: () => void;
}

export const RoomSidebar = ({ currentRoomId, collapsed, onToggle }: RoomSidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, name, owner_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setRooms((data as RoomRow[]) || []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("sidebar-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = rooms.filter((r) =>
    query.trim().length === 0 ? true : r.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·";

  const createRoom = async () => {
    if (!user) return;
    const name = newName.trim() || "Untitled room";
    setCreating(true);
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name, owner_id: user.id })
      .select()
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message || "Failed to create room");
      return;
    }
    await supabase.from("room_documents").insert({ room_id: data.id, content: "", updated_by: user.id });
    setCreateOpen(false);
    setNewName("");
    navigate(`/r/${data.id}`);
  };

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out overflow-hidden",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Brand row */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 min-w-0">
            <Logo showText={!collapsed} />
          </button>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* New room */}
        <div className="px-2 pt-3">
          {collapsed ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="New room"
              aria-label="New room"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start font-normal text-muted-foreground hover:text-foreground"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New room
            </Button>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-2 pt-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rooms"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Rooms list */}
        <div className="mt-3 px-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rooms
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            !collapsed && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No rooms.</p>
            )
          ) : (
            <ul className="space-y-px">
              {filtered.map((r) => {
                const active = r.id === currentRoomId;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => navigate(`/r/${r.id}`)}
                      className={cn(
                        "group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                      title={collapsed ? r.name : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <span
                        className={cn(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-all",
                          active
                            ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                        )}
                      >
                        {initials(r.name)}
                      </span>
                      {!collapsed && (
                        <span className="truncate text-[13px]">{r.name}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer toggle when collapsed */}
        {collapsed && (
          <div className="border-t border-border p-2">
            <button
              onClick={onToggle}
              className="flex h-8 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Expand sidebar"
              title="Expand"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </aside>

      {/* New room dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new room</DialogTitle>
            <DialogDescription>Give it a name. You can change this later.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Q4 planning, Brand workshop, Sprint retro…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoom()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createRoom} disabled={creating}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
