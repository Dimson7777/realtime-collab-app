import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, X, StickyNote, Lock } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useRoomRoles } from "@/hooks/useRoomRoles";
import { NotesSkeleton } from "@/components/skeletons/Skeletons";
import { useSound } from "@/hooks/useSound";

interface Note {
  id: string;
  content: string;
  color: string;
  pos_x: number;
  pos_y: number;
  created_by: string;
}

// Refined sticky-note palette — softer, more curated
const COLORS = ["#fde68a", "#a7f3d0", "#fbcfe8", "#bfdbfe", "#fed7aa", "#ddd6fe", "#fecaca"];

interface NotesBoardProps {
  roomId: string;
}

export const NotesBoard = ({ roomId }: NotesBoardProps) => {
  const { user } = useAuth();
  const { log } = useActivityLogger(roomId);
  const { canEdit } = useRoomRoles(roomId);
  const { play } = useSound();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const debounceRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("room_notes")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (mounted) {
        setNotes((data as Note[]) || []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`notes-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_notes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotes((prev) => (prev.find((n) => n.id === (payload.new as Note).id) ? prev : [...prev, payload.new as Note]));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Note;
            setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setNotes((prev) => prev.filter((n) => n.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const addNote = async () => {
    if (!user || !boardRef.current) return;
    const w = boardRef.current.clientWidth;
    const h = boardRef.current.clientHeight;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const { error } = await supabase.from("room_notes").insert({
      room_id: roomId,
      content: "",
      color,
      pos_x: Math.max(20, Math.random() * (w - 240)),
      pos_y: Math.max(20, Math.random() * (h - 240)),
      created_by: user.id,
    });
    if (!error) {
      play("pop");
      void log("added_note");
    }
  };

  const deleteNote = async (id: string) => {
    play("delete");
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("room_notes").delete().eq("id", id);
    void log("deleted_note");
  };

  const updateNoteContent = (id: string, content: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    const existing = debounceRefs.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      await supabase.from("room_notes").update({ content, updated_at: new Date().toISOString() }).eq("id", id);
    }, 300);
    debounceRefs.current.set(id, t);
  };

  const startDrag = (e: React.PointerEvent, note: Note) => {
    if (!canEdit) return;
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).closest("[data-no-drag]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragStateRef.current = {
      id: note.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setActiveId(note.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || !boardRef.current) return;
    const board = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(board.width - 208, e.clientX - board.left - state.offsetX));
    const y = Math.max(0, Math.min(board.height - 208, e.clientY - board.top - state.offsetY));
    setNotes((prev) => prev.map((n) => (n.id === state.id ? { ...n, pos_x: x, pos_y: y } : n)));
  };

  const endDrag = async () => {
    const state = dragStateRef.current;
    if (!state) return;
    dragStateRef.current = null;
    setActiveId(null);
    const note = notes.find((n) => n.id === state.id);
    if (note) {
      await supabase
        .from("room_notes")
        .update({ pos_x: note.pos_x, pos_y: note.pos_y, updated_at: new Date().toISOString() })
        .eq("id", state.id);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/20">
      {/* Floating action bar */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full glass-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          <StickyNote className="h-3 w-3" />
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </div>
        {canEdit ? (
          <Button onClick={addNote} variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> Add note
          </Button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            <Lock className="h-3 w-3" /> View only
          </div>
        )}
      </div>

      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-mesh opacity-20" />

      <div
        ref={boardRef}
        className="relative h-full w-full bg-dots"
      >
        {loading ? (
          <NotesSkeleton />
        ) : notes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-sm px-6 animate-fade-in-up">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-float">
                <StickyNote className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">An empty canvas</h3>
              <p className="mt-1 text-sm text-muted-foreground">Drop sticky notes, drag them around, brainstorm freely.</p>
              {canEdit ? (
                <Button onClick={addNote} variant="primary" className="mt-6">
                  <Plus className="h-4 w-4" /> Drop your first note
                </Button>
              ) : (
                <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                  <Lock className="h-3 w-3" /> Viewers can't add notes
                </p>
              )}
            </div>
          </div>
        ) : (
          notes.map((note, i) => {
            const isActive = activeId === note.id;
            const rotate = ((parseInt(note.id.slice(0, 8), 16) % 7) - 3) * 0.6;
            return (
              <div
                key={note.id}
                onPointerDown={(e) => startDrag(e, note)}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                className="absolute w-52 select-none transition-shadow"
                style={{
                  left: note.pos_x,
                  top: note.pos_y,
                  touchAction: "none",
                  transform: `rotate(${isActive ? 0 : rotate}deg) scale(${isActive ? 1.04 : 1})`,
                  transition: isActive ? "transform 150ms cubic-bezier(0.4,0,0.2,1)" : "transform 250ms cubic-bezier(0.4,0,0.2,1)",
                  zIndex: isActive ? 30 : 1,
                  animation: `scale-in 0.3s cubic-bezier(0.4,0,0.2,1) ${i * 30}ms backwards`,
                }}
              >
                <div
                  className="rounded-xl shadow-elevated overflow-hidden ring-1 ring-black/5"
                  style={{
                    background: `linear-gradient(135deg, ${note.color}, ${note.color}dd)`,
                    boxShadow: isActive
                      ? `0 20px 40px -8px ${note.color}99, 0 8px 16px -4px ${note.color}66`
                      : undefined,
                  }}
                >
                  <div className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing">
                    <div className="flex gap-1">
                      <div className="h-1 w-1 rounded-full bg-foreground/30" />
                      <div className="h-1 w-1 rounded-full bg-foreground/30" />
                      <div className="h-1 w-1 rounded-full bg-foreground/30" />
                    </div>
                    {canEdit && (
                      <button
                        data-no-drag
                        onClick={() => deleteNote(note.id)}
                        className="rounded p-0.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/80 transition-colors"
                        aria-label="Delete note"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={note.content}
                    onChange={(e) => canEdit && updateNoteContent(note.id, e.target.value)}
                    placeholder={canEdit ? "Type something…" : ""}
                    readOnly={!canEdit}
                    className="block h-36 w-full resize-none border-0 bg-transparent px-3 pb-3 text-sm font-medium text-foreground/90 placeholder:text-foreground/40 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
