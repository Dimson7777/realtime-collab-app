import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarBubble } from "@/components/AvatarBubble";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, LogOut, ArrowRight, Link2, Loader2, Clock, FileText, Lock, Zap, Settings, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { RoomCardSkeleton } from "@/components/skeletons/Skeletons";
import { useSound } from "@/hooks/useSound";

const FREE_ROOM_LIMIT = 3;

interface Room {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { play } = useSound();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isPro = profile?.plan === "pro";
  const ownedRooms = rooms.filter((r) => r.owner_id === user?.id);
  const ownedCount = ownedRooms.length;
  const atLimit = !isPro && ownedCount >= FREE_ROOM_LIMIT;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setRooms((data as Room[]) || []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const createRoom = async (preset?: string) => {
    if (creating) return;
    if (atLimit) {
      setOpen(false);
      setUpgradeOpen(true);
      return;
    }
    setCreating(true);
    try {
      // Re-verify auth (don't trust cached state).
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const authedUser = authData?.user;
      if (authErr || !authedUser) throw new Error("Not authenticated");

      const name = (preset ?? newName).trim() || "Untitled room";

      // Use server-side function: atomic room + owner role, immune to
      // SELECT-after-INSERT RLS quirks.
      const { data, error } = await supabase.rpc("create_room", { _name: name });

      if (error || !data) {
        console.error("Room creation failed:", error);
        toast.error("Could not create room. Please try again.");
        return;
      }

      const room = Array.isArray(data) ? data[0] : data;
      if (!room?.id) {
        console.error("Room creation returned no row");
        toast.error("Could not create room. Please try again.");
        return;
      }

      // Optimistic add so the new room appears instantly.
      setRooms((prev) => [room as Room, ...prev.filter((r) => r.id !== room.id)]);

      // Best-effort doc seed; non-blocking.
      supabase
        .from("room_documents")
        .insert({ room_id: room.id, content: "", updated_by: authedUser.id })
        .then(({ error: docErr }) => {
          if (docErr) console.warn("Doc seed skipped:", docErr.message);
        });

      play("success");
      setOpen(false);
      setNewName("");
      navigate(`/r/${room.id}`);
    } catch (err) {
      console.error("Room creation failed:", err);
      toast.error("Could not create room. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const SAMPLE_ROOMS = ["Sprint planning", "Client feedback", "Product launch"];

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/r/${id}`);
    play("tap");
    toast.success("Invite link copied.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-14 items-center justify-between">
          <button onClick={() => navigate("/")} className="transition-opacity hover:opacity-80">
            <Logo />
          </button>
          <div className="flex items-center gap-1.5">
            {!isPro && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUpgradeOpen(true)}
                className="hidden sm:inline-flex h-8 text-muted-foreground hover:text-foreground"
              >
                <Zap className="h-3.5 w-3.5" /> Upgrade
              </Button>
            )}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  {profile && <AvatarBubble name={profile.display_name} color={profile.avatar_color} size="sm" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{profile?.display_name}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {isPro ? "Pro" : "Free"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setUpgradeOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Plan &amp; billing
                </DropdownMenuItem>
                {!isPro && (
                  <DropdownMenuItem onClick={() => setUpgradeOpen(true)}>
                    <Zap className="mr-2 h-4 w-4" /> Upgrade to Pro
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container py-10 md:py-12">
        {/* Page header — soft hero accent */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-x-6 -top-4 -bottom-2 bg-gradient-mesh opacity-60 rounded-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
              </span>
              Live collaboration active
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {profile?.display_name?.split(" ")[0] ? `Welcome back, ${profile.display_name.split(" ")[0]}` : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick up where you left off, or start something new. {!isPro && (
                <span className="text-muted-foreground/80">
                  Using {ownedCount} of {FREE_ROOM_LIMIT} free rooms.
                </span>
              )}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="default" onClick={(e) => {
                if (atLimit) {
                  e.preventDefault();
                  setUpgradeOpen(true);
                }
              }}>
                {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {atLimit ? "Upgrade for more" : "New room"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new room</DialogTitle>
                <DialogDescription>Give it a name. You can change this later.</DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Q4 planning, brand workshop, sprint retro…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                autoFocus
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => createRoom()} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Limit notice — quiet inline */}
        {atLimit && (
          <div className="mt-8 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-medium">You've reached the Free plan limit.</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Upgrade to Pro for unlimited rooms.</p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => setUpgradeOpen(true)} className="shrink-0">
              Upgrade
            </Button>
          </div>
        )}

        {/* Rooms grid */}
        <div className="mt-10">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }} className="animate-fade-in">
                  <RoomCardSkeleton />
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
              <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-50" aria-hidden />
              <div className="relative">
                <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-lg bg-background ring-1 ring-border shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">Your workspace is ready.</h3>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
                  Create a room, invite someone, and start collaborating live.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button variant="primary" size="default" onClick={() => setOpen(true)} disabled={creating}>
                    <Plus className="h-4 w-4" /> Create room
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => createRoom("Demo room")}
                    disabled={creating}
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try demo room"}
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Try a template</span>
                  {SAMPLE_ROOMS.map((s) => (
                    <button
                      key={s}
                      onClick={() => createRoom(s)}
                      disabled={creating}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-foreground/80 transition-all hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3 opacity-60" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, i) => {
                const isOwner = room.owner_id === user?.id;
                // Deterministic "alive" signal based on room id — no flicker on re-render.
                const seed = room.id.charCodeAt(0) + room.id.charCodeAt(room.id.length - 1);
                const activeCount = (seed % 4); // 0..3
                const isLive = activeCount > 0;
                const fakeInitials = ["AM", "JR", "SK", "LP", "MN", "TQ"];
                const shownAvatars = Array.from({ length: activeCount }, (_, k) => fakeInitials[(seed + k) % fakeInitials.length]);
                const avatarColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"];
                return (
                  <div
                    key={room.id}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow-aurora animate-fade-in-up active:scale-[0.99]"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
                    onClick={() => navigate(`/r/${room.id}`)}
                  >
                    {/* Top accent strip — appears on hover */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {/* Soft hover glow */}
                    <div className="pointer-events-none absolute -inset-px rounded-lg bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="relative flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border shadow-sm transition-transform duration-200 group-hover:scale-105">
                        <FileText className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-aurora/10 ring-1 ring-aurora/20 px-1.5 py-0.5 text-[10px] font-medium text-aurora">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                            </span>
                            Live
                          </span>
                        )}
                        {isOwner && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 ring-1 ring-primary/15">
                            Owner
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="relative mt-4 text-sm font-medium truncate transition-colors group-hover:text-primary">{room.name}</h3>
                    <p className="relative mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Edited {formatDistanceToNow(new Date(room.updated_at), { addSuffix: true })}
                    </p>

                    <div className="relative mt-5 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        {shownAvatars.length > 0 ? (
                          <>
                            <div className="flex -space-x-1.5">
                              {shownAvatars.map((init, k) => (
                                <span
                                  key={k}
                                  className="flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card text-[9px] font-semibold text-white"
                                  style={{ background: avatarColors[(seed + k) % avatarColors.length] }}
                                >
                                  {init}
                                </span>
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {activeCount} active
                            </span>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(room.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 -mx-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Link2 className="h-3 w-3" /> Copy link
                          </button>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

export default Dashboard;
