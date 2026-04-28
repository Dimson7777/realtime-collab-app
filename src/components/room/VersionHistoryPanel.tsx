import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, RotateCcw, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AvatarBubble } from "@/components/AvatarBubble";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { VersionHistorySkeleton } from "@/components/skeletons/Skeletons";

interface VersionRow {
  id: string;
  room_id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_color: string | null;
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  currentContent: string;
  onRestore: (content: string) => Promise<void> | void;
  canEdit?: boolean;
}

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatExact = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const VersionHistoryPanel = ({
  open,
  onClose,
  roomId,
  currentContent,
  onRestore,
  canEdit = true,
}: VersionHistoryPanelProps) => {
  const { user } = useAuth();
  const { log } = useActivityLogger(roomId);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        toast.error("Could not load history");
      } else {
        setVersions((data || []) as VersionRow[]);
        if (data && data.length > 0) setSelectedId(data[0].id);
      }
      setLoading(false);
    };
    load();

    // Realtime: new snapshots appear at the top
    const channel = supabase
      .channel(`versions-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "document_versions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as VersionRow;
          setVersions((prev) => [row, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, roomId]);

  const selected = versions.find((v) => v.id === selectedId) || null;

  const handleRestore = async () => {
    if (!selected || !user) return;
    setRestoring(true);
    try {
      await onRestore(selected.content);
      // Snapshot the restored state so the action is itself a version point
      await supabase.from("document_versions").insert({
        room_id: roomId,
        content: selected.content,
        created_by: user.id,
        created_by_name: "Restored version",
        created_by_color: "#64748b",
      });
      void log("restored_version", `from ${formatRelative(selected.created_at)}`);
      toast.success("Version restored");
      onClose();
    } catch {
      toast.error("Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Version history</h3>
              <p className="text-[11px] text-muted-foreground">
                {versions.length} {versions.length === 1 ? "version" : "versions"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex flex-1 min-h-0 flex-col">
          {/* Versions list */}
          <ScrollArea className="h-1/2 border-b border-border/60">
            {loading ? (
              <VersionHistorySkeleton />
            ) : versions.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center animate-fade-in">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium">No snapshots yet</p>
                <p className="text-xs text-muted-foreground -mt-1.5 max-w-[260px]">
                  Keep editing — Sync will save versions automatically as you go.
                </p>
              </div>
            ) : (
              <ul className="p-2">
                {versions.map((v, i) => {
                  const active = v.id === selectedId;
                  const isCurrent = i === 0;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => setSelectedId(v.id)}
                        className={cn(
                          "group w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                          active
                            ? "border-primary/40 bg-primary/5 shadow-sm"
                            : "border-transparent hover:border-border hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">
                                {formatRelative(v.created_at)}
                              </p>
                              {isCurrent && (
                                <span className="rounded-full bg-aurora/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-aurora">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {formatExact(v.created_at)}
                            </p>
                          </div>
                          {v.created_by_name && v.created_by_color && (
                            <AvatarBubble
                              name={v.created_by_name}
                              color={v.created_by_color}
                              size="sm"
                            />
                          )}
                        </div>
                        {v.created_by_name && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            by{" "}
                            <span className="font-medium text-foreground/80">
                              {v.created_by_name}
                            </span>
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          {/* Preview */}
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              {selected && (
                <p className="text-[11px] text-muted-foreground">
                  {selected.content.trim().split(/\s+/).filter(Boolean).length} words
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
              {selected ? (
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-muted/30 p-4 font-display text-sm leading-relaxed text-foreground/90">
                  {selected.content || (
                    <span className="italic text-muted-foreground">Empty document</span>
                  )}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">Select a version to preview</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRestore}
                disabled={
                  !selected ||
                  restoring ||
                  !canEdit ||
                  selected.content === currentContent
                }
                className="flex-1"
                title={!canEdit ? "Viewers can't restore versions" : undefined}
              >
                {restoring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {canEdit ? "Restore this version" : "View only"}
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
