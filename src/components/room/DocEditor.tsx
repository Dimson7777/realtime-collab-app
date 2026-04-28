import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check, Cloud, CloudOff, History, RefreshCw, Lock } from "lucide-react";
import type { PresencePeer, PeerSelection } from "@/hooks/usePresence";
import { VersionHistoryPanel } from "@/components/room/VersionHistoryPanel";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useRoomRoles } from "@/hooks/useRoomRoles";
import { DocSkeleton } from "@/components/skeletons/Skeletons";
import { useSound } from "@/hooks/useSound";

interface DocEditorProps {
  roomId: string;
  peers?: PresencePeer[];
  broadcastSelection?: (selection: PeerSelection | null) => void;
  broadcastTyping?: (surface: string) => void;
  onContentChange?: (content: string) => void;
}

const queueKey = (roomId: string) => `doc-queue:${roomId}`;

export const DocEditor = ({ roomId, peers = [], broadcastSelection, broadcastTyping, onContentChange }: DocEditorProps) => {
  const { user, profile } = useAuth();
  const { status } = useOnlineStatus();
  const { log } = useActivityLogger(roomId);
  const { canEdit } = useRoomRoles(roomId);
  const { play } = useSound();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [, setMirrorTick] = useState(0);
  const pendingContentRef = useRef<string | null>(null);
  const flushingRef = useRef(false);

  // Snapshot bookkeeping
  const lastSnapshotAtRef = useRef<number>(0);
  const lastSnapshotContentRef = useRef<string>("");
  const SNAPSHOT_MIN_INTERVAL_MS = 60_000; // 1 min minimum gap
  const SNAPSHOT_FORCE_INTERVAL_MS = 5 * 60_000; // 5 min forced
  const SNAPSHOT_MIN_DELTA = 20; // chars

  const maybeSnapshot = async (currentContent: string) => {
    if (!user) return;
    const sameAsLast = currentContent === lastSnapshotContentRef.current;
    if (sameAsLast) return;
    const now = Date.now();
    const sinceLast = now - lastSnapshotAtRef.current;
    const delta = Math.abs(currentContent.length - lastSnapshotContentRef.current.length);
    const shouldSnapshot =
      sinceLast >= SNAPSHOT_FORCE_INTERVAL_MS ||
      (sinceLast >= SNAPSHOT_MIN_INTERVAL_MS && delta >= SNAPSHOT_MIN_DELTA);
    if (!shouldSnapshot) return;
    lastSnapshotAtRef.current = now;
    lastSnapshotContentRef.current = currentContent;
    await supabase.from("document_versions").insert({
      room_id: roomId,
      content: currentContent,
      created_by: user.id,
      created_by_name: profile?.display_name ?? null,
      created_by_color: profile?.avatar_color ?? null,
    });
    void log("created_version");
  };

  // Persist queued content to localStorage so it survives reloads while offline
  const queueLocally = (v: string) => {
    try {
      localStorage.setItem(
        queueKey(roomId),
        JSON.stringify({ content: v, ts: Date.now() })
      );
    } catch {
      /* quota — ignore */
    }
    setPendingSync(true);
  };

  const clearQueue = () => {
    try {
      localStorage.removeItem(queueKey(roomId));
    } catch {
      /* ignore */
    }
    setPendingSync(false);
  };

  // Try to push pending content to the server. Re-queues on failure.
  const flush = async () => {
    if (flushingRef.current) return;
    const v = pendingContentRef.current;
    if (v === null || !user) return;
    if (!navigator.onLine) return;
    flushingRef.current = true;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("room_documents")
        .update({ content: v, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("room_id", roomId);
      if (error) throw error;
      pendingContentRef.current = null;
      clearQueue();
      setSavedAt(Date.now());
      play("success");
      void maybeSnapshot(v);
    } catch {
      // Keep queued; will retry on next change or reconnect
      queueLocally(v);
    } finally {
      flushingRef.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("room_documents")
        .select("content")
        .eq("room_id", roomId)
        .maybeSingle();
      if (!mounted) return;

      // Restore any queued offline edits
      let queued: { content: string; ts: number } | null = null;
      try {
        const raw = localStorage.getItem(queueKey(roomId));
        if (raw) queued = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      const serverContent = data?.content ?? "";
      const useQueued = queued && queued.content !== serverContent;
      const initial = useQueued ? queued!.content : serverContent;
      setContent(initial);
      setWordCount(initial.trim().split(/\s+/).filter(Boolean).length);

      if (useQueued) {
        // Schedule a flush of the queued content
        pendingContentRef.current = queued!.content;
        setPendingSync(true);
        void flush();
      }

      if (data) {
        // Seed snapshot bookkeeping with the most recent existing version (if any)
        const { data: latest } = await supabase
          .from("document_versions")
          .select("content, created_at")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest) {
          lastSnapshotContentRef.current = latest.content;
          lastSnapshotAtRef.current = new Date(latest.created_at).getTime();
        } else if (initial.trim().length > 0 && user) {
          await supabase.from("document_versions").insert({
            room_id: roomId,
            content: initial,
            created_by: user.id,
            created_by_name: profile?.display_name ?? null,
            created_by_color: profile?.avatar_color ?? null,
          });
          lastSnapshotContentRef.current = initial;
          lastSnapshotAtRef.current = Date.now();
        }
      } else if (user) {
        await supabase.from("room_documents").insert({ room_id: roomId, content: "", updated_by: user.id });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, profile?.display_name, profile?.avatar_color]);

  useEffect(() => {
    const channel = supabase
      .channel(`doc-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_documents", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newRow = payload.new as { content: string; updated_by: string | null };
          if (newRow.updated_by === user?.id) return;
          // Don't clobber unsynced local edits
          if (pendingContentRef.current !== null) return;
          const ta = textareaRef.current;
          const pos = ta?.selectionStart;
          setContent(newRow.content);
          setWordCount((newRow.content || "").trim().split(/\s+/).filter(Boolean).length);
          if (ta && pos != null)
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = Math.min(pos, newRow.content.length);
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  // Auto-flush whenever connection comes back
  useEffect(() => {
    if (status === "online" && pendingContentRef.current !== null) {
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Warn user if they try to close the tab with unsynced edits
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContentRef.current !== null) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!canEdit) return;
    const v = e.target.value;
    setContent(v);
    onContentChange?.(v);
    setWordCount(v.trim().split(/\s+/).filter(Boolean).length);
    pendingContentRef.current = v;
    queueLocally(v);
    setSaving(true);
    broadcastTyping?.("doc");
    void log("edited_doc", undefined, { throttleMs: 60_000 });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flush();
    }, 350);
  };

  const handleRestore = async (restored: string) => {
    if (!user || !canEdit) return;
    setContent(restored);
    setWordCount(restored.trim().split(/\s+/).filter(Boolean).length);
    pendingContentRef.current = restored;
    queueLocally(restored);
    await flush();
    lastSnapshotContentRef.current = restored;
    lastSnapshotAtRef.current = Date.now();
  };

  // Track local selection and broadcast it
  const handleSelect = () => {
    const ta = textareaRef.current;
    if (!ta || !broadcastSelection) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      broadcastSelection(null);
    } else {
      broadcastSelection({ surface: "doc", start, end });
    }
  };

  const handleBlur = () => {
    if (broadcastSelection) broadcastSelection(null);
  };

  // Trigger mirror re-measure on content / scroll / resize / peers change
  useLayoutEffect(() => {
    setMirrorTick((t) => (t + 1) % 1_000_000);
  }, [content, peers]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => setMirrorTick((t) => (t + 1) % 1_000_000);
    const onResize = () => setMirrorTick((t) => (t + 1) % 1_000_000);
    ta.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    return () => {
      ta.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Compute peer selection rectangles using a mirror div
  const peerSelections = peers.flatMap((p) => {
    const sel = p.selection;
    if (!sel || sel.surface !== "doc") return [];
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return [];
    const length = content.length;
    const start = Math.min(sel.start, length);
    const end = Math.min(sel.end, length);
    if (start >= end) return [];

    // Build mirror nodes: pre, span (selection), post
    mirror.textContent = "";
    const pre = document.createTextNode(content.slice(0, start));
    const span = document.createElement("span");
    span.textContent = content.slice(start, end);
    const post = document.createTextNode(content.slice(end));
    mirror.appendChild(pre);
    mirror.appendChild(span);
    mirror.appendChild(post);

    const mirrorRect = mirror.getBoundingClientRect();
    const rects = Array.from(span.getClientRects());
    return rects.map((r, i) => ({
      key: `${p.user_id}-${i}`,
      x: r.left - mirrorRect.left,
      y: r.top - mirrorRect.top,
      w: r.width,
      h: r.height,
      color: p.avatar_color,
      name: p.display_name,
      isFirst: i === 0,
    }));
  });

  if (loading) {
    return (
      <div className="h-full bg-gradient-subtle">
        <DocSkeleton />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-gradient-subtle">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-mesh opacity-30" />

      {/* Top-right controls: history + save indicator */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {!canEdit && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            <Lock className="h-3 w-3" /> View only
          </div>
        )}
        <button
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full glass-card px-3 py-1.5 text-[11px] font-medium text-foreground/80 shadow-sm transition-all hover:text-foreground hover:shadow-md"
          aria-label="Open version history"
        >
          <History className="h-3 w-3" />
          History
        </button>
        <div className="flex items-center gap-1.5 rounded-full glass-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
          {status === "offline" ? (
            <>
              <CloudOff className="h-3 w-3 text-destructive" />
              <span className="text-destructive">
                Offline{pendingSync ? " — changes saved locally" : ""}
              </span>
            </>
          ) : status === "reconnecting" ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-warning" />
              <span className="text-warning">
                Reconnecting{pendingSync ? " — will sync" : "…"}
              </span>
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Saving…
            </>
          ) : pendingSync ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Syncing…
            </>
          ) : savedAt ? (
            <>
              <Check className="h-3 w-3 text-aurora" /> Saved
            </>
          ) : (
            <>
              <Cloud className="h-3 w-3 text-aurora" /> Up to date
            </>
          )}
        </div>
      </div>

      {/* Typing indicator */}
      {(() => {
        const now = Date.now();
        const typingPeers = peers.filter(
          (p) => p.typing && p.typing.surface === "doc" && now - p.typing.at < 3000
        );
        if (typingPeers.length === 0) return null;
        const names =
          typingPeers.length === 1
            ? `${typingPeers[0].display_name} is typing`
            : typingPeers.length === 2
            ? `${typingPeers[0].display_name} and ${typingPeers[1].display_name} are typing`
            : `${typingPeers.length} people are typing`;
        return (
          <div className="absolute left-4 bottom-14 z-20 inline-flex items-center gap-2 rounded-full glass-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm animate-fade-in">
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
            </span>
            {names}…
          </div>
        );
      })()}

      {/* Word count */}
      <div className="absolute left-4 bottom-4 z-20 rounded-full glass-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </div>

      <div className="relative mx-auto h-full w-full max-w-3xl overflow-y-auto scrollbar-thin px-6 py-14 md:px-14 md:py-24">
        <div className="relative">
          {/* Hidden mirror used to compute selection rects.
              MUST share font, padding, width, line-height and wrapping with the textarea. */}
          <div
            ref={mirrorRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 invisible whitespace-pre-wrap break-words font-display text-lg leading-[1.75]"
            style={{
              padding: 0,
              margin: 0,
              border: 0,
              wordBreak: "break-word",
            }}
          />

          {/* Peer selection overlay */}
          <div className="pointer-events-none absolute inset-0 z-10">
            {peerSelections.map((s) => (
              <div
                key={s.key}
                className="absolute rounded-[3px] animate-fade-in"
                style={{
                  left: s.x,
                  top: s.y,
                  width: s.w,
                  height: s.h,
                  background: `${s.color}33`,
                  boxShadow: `inset 0 0 0 1px ${s.color}66`,
                }}
              >
                {s.isFirst && (
                  <div
                    className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white shadow"
                    style={{ background: s.color }}
                  >
                    {s.name}
                  </div>
                )}
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={onChange}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onMouseUp={handleSelect}
            onBlur={handleBlur}
            placeholder={canEdit ? "Untitled document — start writing…" : "Nothing here yet"}
            readOnly={!canEdit}
            className="relative z-20 block min-h-[60vh] w-full resize-none border-0 bg-transparent font-display text-lg leading-[1.75] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 selection:bg-primary/20"
            style={{ caretColor: "hsl(var(--primary))", padding: 0, margin: 0 }}
            spellCheck={canEdit}
          />
        </div>
      </div>

      <VersionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        roomId={roomId}
        currentContent={content}
        onRestore={handleRestore}
        canEdit={canEdit}
      />
    </div>
  );
};
