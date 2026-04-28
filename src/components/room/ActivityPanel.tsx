import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  X,
  FileText,
  StickyNote,
  Trash2,
  MessageSquare,
  RotateCcw,
  LogIn,
  GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityAction } from "@/hooks/useActivityLogger";
import { ActivitySkeleton } from "@/components/skeletons/Skeletons";

interface ActivityRow {
  id: string;
  room_id: string;
  user_id: string | null;
  user_name: string | null;
  user_color: string | null;
  action: ActivityAction | string;
  detail: string | null;
  created_at: string;
}

interface ActivityPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const formatExact = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const ACTION_META: Record<
  string,
  { label: string; icon: typeof Activity; tone: string }
> = {
  joined: { label: "joined the room", icon: LogIn, tone: "text-aurora" },
  edited_doc: { label: "edited the document", icon: FileText, tone: "text-primary" },
  added_note: { label: "added a sticky note", icon: StickyNote, tone: "text-warning" },
  deleted_note: { label: "deleted a sticky note", icon: Trash2, tone: "text-destructive" },
  sent_message: { label: "sent a message", icon: MessageSquare, tone: "text-iris" },
  restored_version: { label: "restored a version", icon: RotateCcw, tone: "text-primary" },
  created_version: { label: "saved a version", icon: GitCommit, tone: "text-muted-foreground" },
};

const groupByDay = (rows: ActivityRow[]) => {
  const groups = new Map<string, ActivityRow[]>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = d.toDateString();
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return Array.from(groups.entries());
};

const dayLabel = (key: string) => {
  const d = new Date(key);
  const today = new Date().toDateString();
  const yest = new Date(Date.now() - 86400000).toDateString();
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

export const ActivityPanel = ({ open, onClose, roomId }: ActivityPanelProps) => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("room_activity")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setRows((data || []) as ActivityRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`activity-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_activity",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as ActivityRow;
          setRows((prev) => (prev.find((r) => r.id === row.id) ? prev : [row, ...prev].slice(0, 200)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, roomId]);

  const grouped = useMemo(() => groupByDay(rows), [rows]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          // Mobile: slide-over. Desktop: in-flow collapsible right rail.
          "z-50 flex h-screen flex-col border-l border-border bg-card transition-all duration-200 ease-out",
          "fixed right-0 top-0 w-full max-w-sm md:static md:max-w-none md:h-auto md:w-[300px] md:flex-shrink-0",
          open ? "translate-x-0 md:w-[300px]" : "translate-x-full md:translate-x-0 md:w-0 md:border-l-0 md:overflow-hidden"
        )}
        aria-hidden={!open}
      >
        <div className={cn("flex h-full min-h-0 flex-col md:w-[300px]", !open && "md:hidden")}>
          <header className="flex h-14 items-center justify-between border-b border-border px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[13px] font-semibold">Activity</h3>
              <span className="text-[11px] text-muted-foreground">
                · {rows.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close activity panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          <ScrollArea className="flex-1">
            {loading ? (
              <ActivitySkeleton />
            ) : rows.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center gap-2 px-6 text-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Quiet for now</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Edits, notes, messages and restores will appear here.
                </p>
              </div>
            ) : (
              <div className="px-3 py-3">
                {grouped.map(([day, items]) => (
                  <div key={day} className="mb-4 last:mb-0">
                    <div className="sticky top-0 z-10 mb-1.5 bg-card px-1 py-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {dayLabel(day)}
                      </p>
                    </div>
                    <ol className="relative space-y-0.5 pl-2">
                      <span
                        aria-hidden
                        className="absolute left-[14px] top-1 bottom-1 w-px bg-border"
                      />
                      {items.map((r) => {
                        const meta =
                          ACTION_META[r.action] ?? {
                            label: r.action.replace(/_/g, " "),
                            icon: Activity,
                            tone: "text-muted-foreground",
                          };
                        const Icon = meta.icon;
                        const name = r.user_name || "Someone";
                        const color = r.user_color || "#94a3b8";
                        return (
                          <li
                            key={r.id}
                            className="group relative flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60"
                          >
                            <div
                              className="relative z-10 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border"
                            >
                              <Icon className={cn("h-3 w-3", meta.tone)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] leading-snug text-foreground/90">
                                <span
                                  className="font-medium"
                                  style={{ color }}
                                >
                                  {name}
                                </span>{" "}
                                <span className="text-muted-foreground">{meta.label}</span>
                                {r.detail && (
                                  <span className="text-foreground/80"> — {r.detail}</span>
                                )}
                              </p>
                              <p
                                className="mt-0.5 text-[10px] text-muted-foreground"
                                title={formatExact(r.created_at)}
                              >
                                {formatRelative(r.created_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    </>
  );
};
