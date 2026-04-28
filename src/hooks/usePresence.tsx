import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PeerSelection {
  surface: string; // e.g. "doc"
  start: number;
  end: number;
}

export interface PeerClick {
  id: number; // unique per click so listeners can re-trigger animation
  x: number;
  y: number;
  surface: string;
}

export interface PresencePeer {
  user_id: string;
  display_name: string;
  avatar_color: string;
  cursor?: { x: number; y: number; surface: string } | null;
  selection?: PeerSelection | null;
  click?: PeerClick | null;
  typing?: { surface: string; at: number } | null;
}

export const usePresence = (roomId: string) => {
  const { user, profile } = useAuth();
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cursorRef = useRef<{ x: number; y: number; surface: string } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list: PresencePeer[] = [];
        const currentIds = new Set<string>();
        Object.entries(state).forEach(([key, metas]) => {
          const meta = (metas as unknown as PresencePeer[])[0];
          if (meta) {
            list.push({ ...meta, user_id: key });
            currentIds.add(key);
          }
        });
        if (initializedRef.current) {
          currentIds.forEach((id) => {
            if (!seenRef.current.has(id) && id !== user.id) {
              const peer = list.find((p) => p.user_id === id);
              if (peer) toast(`${peer.display_name} joined`, { duration: 2000 });
            }
          });
        }
        seenRef.current = currentIds;
        initializedRef.current = true;
        setPeers((prev) => {
          // Preserve transient fields (selection / click) from prev state
          return list.map((p) => {
            const existing = prev.find((x) => x.user_id === p.user_id);
            return existing ? { ...p, selection: existing.selection, click: existing.click } : p;
          });
        });
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        const meta = leftPresences[0] as unknown as PresencePeer | undefined;
        if (meta && key !== user.id) {
          toast(`${meta.display_name} left`, { duration: 2000 });
        }
      })
      .on("broadcast", { event: "cursor" }, (payload) => {
        const data = payload.payload as PresencePeer;
        if (data.user_id === user.id) return;
        setPeers((prev) => {
          const idx = prev.findIndex((p) => p.user_id === data.user_id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], cursor: data.cursor };
          return next;
        });
      })
      .on("broadcast", { event: "selection" }, (payload) => {
        const data = payload.payload as { user_id: string; selection: PeerSelection | null };
        if (data.user_id === user.id) return;
        setPeers((prev) => {
          const idx = prev.findIndex((p) => p.user_id === data.user_id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], selection: data.selection };
          return next;
        });
      })
      .on("broadcast", { event: "click" }, (payload) => {
        const data = payload.payload as { user_id: string; click: PeerClick };
        if (data.user_id === user.id) return;
        setPeers((prev) => {
          const idx = prev.findIndex((p) => p.user_id === data.user_id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], click: data.click };
          return next;
        });
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as { user_id: string; typing: { surface: string; at: number } | null };
        if (data.user_id === user.id) return;
        setPeers((prev) => {
          const idx = prev.findIndex((p) => p.user_id === data.user_id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], typing: data.typing };
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            display_name: profile.display_name,
            avatar_color: profile.avatar_color,
            cursor: null,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      initializedRef.current = false;
      seenRef.current = new Set();
    };
  }, [roomId, user, profile]);

  const sendRafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number; surface: string } | null>(null);

  const flushCursor = useCallback(() => {
    sendRafRef.current = null;
    const channel = channelRef.current;
    if (!channel || !user || !profile) return;
    const cursor = pendingRef.current;
    cursorRef.current = cursor;
    channel.send({
      type: "broadcast",
      event: "cursor",
      payload: {
        user_id: user.id,
        display_name: profile.display_name,
        avatar_color: profile.avatar_color,
        cursor,
      },
    });
  }, [user, profile]);

  const broadcastCursor = useCallback(
    (cursor: { x: number; y: number; surface: string } | null) => {
      pendingRef.current = cursor;
      if (cursor === null) {
        if (sendRafRef.current) {
          cancelAnimationFrame(sendRafRef.current);
          sendRafRef.current = null;
        }
        flushCursor();
        return;
      }
      if (sendRafRef.current == null) {
        sendRafRef.current = requestAnimationFrame(flushCursor);
      }
    },
    [flushCursor]
  );

  // Selection broadcasting (throttled)
  const lastSelRef = useRef<string>("");
  const selTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastSelection = useCallback(
    (selection: PeerSelection | null) => {
      const channel = channelRef.current;
      if (!channel || !user || !profile) return;
      const key = selection ? `${selection.surface}:${selection.start}:${selection.end}` : "null";
      if (key === lastSelRef.current) return;
      lastSelRef.current = key;
      if (selTimerRef.current) clearTimeout(selTimerRef.current);
      selTimerRef.current = setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "selection",
          payload: { user_id: user.id, selection },
        });
      }, 60);
    },
    [user, profile]
  );

  // Click pulse broadcasting (immediate)
  const broadcastClick = useCallback(
    (click: { x: number; y: number; surface: string }) => {
      const channel = channelRef.current;
      if (!channel || !user || !profile) return;
      channel.send({
        type: "broadcast",
        event: "click",
        payload: {
          user_id: user.id,
          click: { ...click, id: Date.now() + Math.random() },
        },
      });
    },
    [user, profile]
  );

  // Typing indicator (throttled start, debounced stop)
  const lastTypingSentRef = useRef<number>(0);
  const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastTyping = useCallback(
    (surface: string) => {
      const channel = channelRef.current;
      if (!channel || !user) return;
      const now = Date.now();
      if (now - lastTypingSentRef.current > 1500) {
        lastTypingSentRef.current = now;
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: user.id, typing: { surface, at: now } },
        });
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(() => {
        lastTypingSentRef.current = 0;
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: user.id, typing: null },
        });
      }, 2200);
    },
    [user]
  );

  return { peers, broadcastCursor, broadcastSelection, broadcastClick, broadcastTyping };
};
