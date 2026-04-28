import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarBubble } from "@/components/AvatarBubble";
import { DocEditor } from "@/components/room/DocEditor";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { NotesBoard } from "@/components/room/NotesBoard";
import { ChatPanel } from "@/components/room/ChatPanel";
import { LiveCursors } from "@/components/room/LiveCursors";
import { toast } from "sonner";
import {
  Link2,
  LogOut,
  MessageSquare,
  X,
  FileText,
  StickyNote,
  Check,
  Activity,
  Users,
  History,
  Settings,
  CreditCard,
  PanelLeft,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { ActivityPanel } from "@/components/room/ActivityPanel";
import { MembersPanel } from "@/components/room/MembersPanel";
import { VersionHistoryPanel } from "@/components/room/VersionHistoryPanel";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useRoomRoles } from "@/hooks/useRoomRoles";
import { RoleBadge } from "@/components/RoleBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { RoomSidebar } from "@/components/room/RoomSidebar";
import { RoomSkeleton } from "@/components/skeletons/Skeletons";
import { SoundToggle } from "@/components/SoundToggle";
import { useSound } from "@/hooks/useSound";

interface Room {
  id: string;
  name: string;
  owner_id: string;
}

const SIDEBAR_KEY = "sync:sidebar-collapsed";

const Room = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"doc" | "notes">("doc");
  const [chatOpen, setChatOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const isPro = profile?.plan === "pro";
  const surfaceRef = useRef<HTMLDivElement>(null);
  const joinLoggedRef = useRef(false);

  const { peers, broadcastCursor, broadcastSelection, broadcastClick, broadcastTyping } = usePresence(id || "");
  const { log: logActivity } = useActivityLogger(id || "");
  const { roles, myRole, canEdit } = useRoomRoles(id);
  const { play } = useSound();

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle();
      if (!mounted) return;
      if (error || !data) {
        toast.error("Room not found");
        navigate("/dashboard");
        return;
      }
      setRoom(data as Room);
      setLoading(false);
      if (!joinLoggedRef.current) {
        joinLoggedRef.current = true;
        void logActivity("joined");
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const members = useMemo(() => {
    const m = new Map<string, { display_name: string; avatar_color: string }>();
    peers.forEach((p) => m.set(p.user_id, { display_name: p.display_name, avatar_color: p.avatar_color }));
    return m;
  }, [peers]);

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    broadcastCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, surface: tab });
  };
  const onPointerLeave = () => broadcastCursor(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    broadcastClick({ x: e.clientX - rect.left, y: e.clientY - rect.top, surface: tab });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    play("success");
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRestoreFromHistory = async (restored: string) => {
    if (!user || !id) return;
    setDocContent(restored);
    await supabase
      .from("room_documents")
      .update({ content: restored, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("room_id", id);
  };

  if (loading || !room) return <RoomSkeleton />;

  const peerList = peers.filter((p) => p.user_id !== user?.id);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Left sidebar (rooms list) */}
        <RoomSidebar
          currentRoomId={room.id}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />

        <div className="flex flex-1 min-w-0 flex-col">
          {/* Header */}
          <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-background px-3 md:px-4">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile sidebar trigger – just navigates back to dashboard */}
              <button
                onClick={() => navigate("/dashboard")}
                className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Back to dashboard"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="truncate text-[14px] font-semibold">{room.name}</h1>
                {myRole && <RoleBadge role={myRole} className="hidden sm:inline-flex" />}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Presence stack */}
              <div className="hidden md:flex items-center mr-1.5">
                <div className="flex -space-x-1.5">
                  {profile && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <AvatarBubble name={profile.display_name} color={profile.avatar_color} size="sm" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">You</TooltipContent>
                    </Tooltip>
                  )}
                  {peerList.slice(0, 3).map((p) => {
                    const peerRole = roles.get(p.user_id);
                    return (
                      <Tooltip key={p.user_id}>
                        <TooltipTrigger asChild>
                          <div>
                            <AvatarBubble name={p.display_name} color={p.avatar_color} size="sm" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="flex items-center gap-1.5">
                            {p.display_name}
                            {peerRole && <RoleBadge role={peerRole} compact />}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {peerList.length > 3 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
                      +{peerList.length - 3}
                    </div>
                  )}
                </div>
              </div>

              <ConnectionBadge className="hidden lg:inline-flex mr-1" />

              <Button variant="outline" size="sm" onClick={copyLink} className="h-8 hidden sm:inline-flex">
                {copied ? <Check className="h-3.5 w-3.5 text-aurora" /> : <Link2 className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Share"}</span>
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { play("tap"); setChatOpen((o) => !o); }}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      chatOpen
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-label="Toggle chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { play("swoosh"); setActivityOpen((o) => !o); }}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      activityOpen
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    aria-label="Toggle activity panel"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Activity</TooltipContent>
              </Tooltip>

              {/* Room menu — advanced features collapsed here */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="Room menu"
                    title="More"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Room
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={copyLink}>
                    <Link2 className="mr-2 h-4 w-4" /> Share link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                    <History className="mr-2 h-4 w-4" /> Version history
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMembersOpen(true)}>
                    <Users className="mr-2 h-4 w-4" /> Members & permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Workspace
                  </DropdownMenuLabel>
                  {!isPro && (
                    <DropdownMenuItem onClick={() => setUpgradeOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade plan
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setUpgradeOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Settings className="mr-2 h-4 w-4" /> All rooms
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <SoundToggle className="h-8 w-8" />
              <ThemeToggle className="h-8 w-8" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    {profile && <AvatarBubble name={profile.display_name} color={profile.avatar_color} size="sm" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{profile?.display_name}</p>
                      <span className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {isPro ? "Pro" : "Free"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>All rooms</DropdownMenuItem>
                  {!isPro && (
                    <DropdownMenuItem onClick={() => setUpgradeOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade to Pro
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            <main className="flex flex-1 min-w-0 flex-col">
              {/* Segmented tabs */}
              <div className="flex items-center justify-between border-b border-border bg-background px-3 md:px-4 h-11">
                <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5">
                  {[
                    { id: "doc" as const, label: "Document", icon: FileText },
                    { id: "notes" as const, label: "Notes", icon: StickyNote },
                  ].map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (tab !== t.id) play("swoosh");
                          setTab(t.id);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-all",
                          active
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground hidden md:block">
                  {peers.length} {peers.length === 1 ? "person" : "people"} here
                </div>
              </div>

              <div
                ref={surfaceRef}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                onPointerDown={onPointerDown}
                className="relative flex-1 min-h-0 overflow-hidden bg-background"
              >
                <div className={cn("absolute inset-0 transition-opacity duration-200", tab === "doc" ? "opacity-100 z-10" : "opacity-0 pointer-events-none")}>
                  <DocEditor
                    roomId={room.id}
                    peers={peerList}
                    broadcastSelection={broadcastSelection}
                    broadcastTyping={broadcastTyping}
                    onContentChange={setDocContent}
                  />
                </div>
                <div className={cn("absolute inset-0 transition-opacity duration-200", tab === "notes" ? "opacity-100 z-10" : "opacity-0 pointer-events-none")}>
                  <NotesBoard roomId={room.id} />
                </div>
                <LiveCursors peers={peerList} surface={tab} />
              </div>
            </main>

            {/* Activity right rail (desktop in-flow) */}
            <ActivityPanel
              open={activityOpen}
              onClose={() => setActivityOpen(false)}
              roomId={room.id}
            />

            {/* Chat sidebar (desktop) */}
            <aside
              className={cn(
                "hidden md:flex flex-shrink-0 flex-col border-l border-border bg-background overflow-hidden transition-[width] duration-200",
                chatOpen ? "w-[320px]" : "w-0"
              )}
            >
              <div className={cn("w-[320px] h-full transition-opacity", chatOpen ? "opacity-100" : "opacity-0")}>
                <ChatPanel roomId={room.id} members={members} />
              </div>
            </aside>

            {/* Mobile chat overlay */}
            {chatOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
                <div className="flex h-14 items-center justify-between border-b border-border px-4">
                  <h3 className="text-sm font-semibold">Chat</h3>
                  <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatPanel roomId={room.id} members={members} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <MembersPanel
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        roomId={room.id}
        onlineIds={new Set(peers.map((p) => p.user_id))}
      />
      <VersionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        roomId={room.id}
        currentContent={docContent}
        onRestore={handleRestoreFromHistory}
        canEdit={canEdit}
      />
    </TooltipProvider>
  );
};

export default Room;
