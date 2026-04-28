import { useEffect, useRef, useState } from "react";
import { PresencePeer } from "@/hooks/usePresence";
import { MousePointer2 } from "lucide-react";

interface LiveCursorsProps {
  peers: PresencePeer[];
  surface: string;
}

interface CursorState {
  user_id: string;
  display_name: string;
  avatar_color: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  opacity: number;
  /** Label opacity — fades in on movement, out on idle */
  labelOpacity: number;
  active: boolean;
  fresh: boolean;
  /** Timestamp of last position update (ms, performance.now) */
  lastMoveAt: number;
}

interface PulseState {
  key: string;
  x: number;
  y: number;
  color: string;
  bornAt: number;
}

export const LiveCursors = ({ peers, surface }: LiveCursorsProps) => {
  const [, setTick] = useState(0);
  const cursorsRef = useRef<Map<string, CursorState>>(new Map());
  const pulsesRef = useRef<PulseState[]>([]);
  const lastClickIdRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);

  // Sync cursors from peers
  useEffect(() => {
    const map = cursorsRef.current;
    const seen = new Set<string>();
    for (const p of peers) {
      seen.add(p.user_id);
      const c = p.cursor;
      const onSurface = !!(c && c.surface === surface);
      const existing = map.get(p.user_id);
      if (onSurface && c) {
        const now = performance.now();
        if (!existing || !existing.active) {
          map.set(p.user_id, {
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_color: p.avatar_color,
            x: c.x,
            y: c.y,
            tx: c.x,
            ty: c.y,
            opacity: existing?.opacity ?? 0,
            labelOpacity: existing?.labelOpacity ?? 1,
            active: true,
            fresh: true,
            lastMoveAt: now,
          });
        } else {
          const moved = Math.abs(existing.tx - c.x) > 0.5 || Math.abs(existing.ty - c.y) > 0.5;
          existing.tx = c.x;
          existing.ty = c.y;
          existing.display_name = p.display_name;
          existing.avatar_color = p.avatar_color;
          existing.active = true;
          if (moved) existing.lastMoveAt = now;
        }
      } else if (existing) {
        existing.active = false;
      }
    }
    for (const [id, c] of map) {
      if (!seen.has(id)) c.active = false;
    }
  }, [peers, surface]);

  // Sync click pulses from peers
  useEffect(() => {
    let added = false;
    for (const p of peers) {
      const click = p.click;
      if (!click || click.surface !== surface) continue;
      const last = lastClickIdRef.current.get(p.user_id);
      if (last === click.id) continue;
      lastClickIdRef.current.set(p.user_id, click.id);
      pulsesRef.current.push({
        key: `${p.user_id}-${click.id}`,
        x: click.x,
        y: click.y,
        color: p.avatar_color,
        bornAt: performance.now(),
      });
      added = true;
    }
    if (added) setTick((t) => (t + 1) % 1_000_000);
  }, [peers, surface]);

  // Animation loop
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const map = cursorsRef.current;
      let needsRender = false;
      const toDelete: string[] = [];

      const moveAlpha = 1 - Math.pow(1 - 0.28, dt / 16.6667);
      const fadeStep = dt / 180;
      const labelFadeStep = dt / 220;
      const IDLE_BEFORE_FADE_MS = 1400;

      for (const [id, c] of map) {
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        if (c.fresh) {
          c.fresh = false;
          needsRender = true;
        } else if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          c.x += dx * moveAlpha;
          c.y += dy * moveAlpha;
          needsRender = true;
        }

        const targetOpacity = c.active ? 1 : 0;
        if (c.opacity !== targetOpacity) {
          c.opacity =
            c.opacity < targetOpacity
              ? Math.min(targetOpacity, c.opacity + fadeStep)
              : Math.max(targetOpacity, c.opacity - fadeStep);
          needsRender = true;
        }

        // Label fades after the cursor sits idle for a beat
        const idleMs = now - c.lastMoveAt;
        const labelTarget = c.active && idleMs < IDLE_BEFORE_FADE_MS ? 1 : 0;
        if (c.labelOpacity !== labelTarget) {
          c.labelOpacity =
            c.labelOpacity < labelTarget
              ? Math.min(labelTarget, c.labelOpacity + labelFadeStep)
              : Math.max(labelTarget, c.labelOpacity - labelFadeStep);
          needsRender = true;
        } else if (c.active && idleMs < IDLE_BEFORE_FADE_MS + 240) {
          // Keep ticking briefly so the fade engages right at the boundary
          needsRender = true;
        }

        if (!c.active && c.opacity <= 0) toDelete.push(id);
      }
      for (const id of toDelete) map.delete(id);

      // Expire pulses after 700ms
      const before = pulsesRef.current.length;
      pulsesRef.current = pulsesRef.current.filter((p) => now - p.bornAt < 700);
      if (pulsesRef.current.length !== before) needsRender = true;
      if (pulsesRef.current.length > 0) needsRender = true;

      if (needsRender || toDelete.length) setTick((t) => (t + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cursors = Array.from(cursorsRef.current.values());
  const now = performance.now();

  return (
    <>
      {/* Click pulses */}
      {pulsesRef.current.map((p) => {
        const age = (now - p.bornAt) / 700;
        const scale = 0.4 + age * 2.8;
        const opacity = Math.max(0, 1 - age);
        return (
          <div
            key={p.key}
            className="pointer-events-none absolute z-40"
            style={{
              left: 0,
              top: 0,
              transform: `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`,
            }}
          >
            <div
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: p.color,
                opacity: opacity * 0.35,
                transform: `translate(-50%, -50%) scale(${scale})`,
                filter: `blur(0.5px)`,
              }}
            />
            <div
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: p.color,
                opacity: opacity * 0.9,
                boxShadow: `0 0 12px ${p.color}`,
              }}
            />
          </div>
        );
      })}

      {/* Cursors */}
      {cursors.map((c) => {
        const labelScale = 0.9 + c.labelOpacity * 0.1;
        return (
          <div
            key={c.user_id}
            className="pointer-events-none absolute left-0 top-0 z-50 will-change-transform"
            style={{
              transform: `translate3d(${Math.round(c.x)}px, ${Math.round(c.y)}px, 0)`,
              opacity: c.opacity,
            }}
          >
            <MousePointer2
              className="h-4 w-4 -translate-x-[2px] -translate-y-[2px]"
              style={{
                color: c.avatar_color,
                fill: c.avatar_color,
                filter: `drop-shadow(0 2px 6px ${c.avatar_color}66)`,
              }}
            />
            <div
              className="ml-3 mt-0.5 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium text-white shadow-lg ring-1 ring-black/10 whitespace-nowrap"
              style={{
                background: c.avatar_color,
                opacity: c.labelOpacity,
                transform: `scale(${labelScale})`,
                transformOrigin: "left top",
                transition: "opacity 220ms ease-out",
              }}
            >
              {c.display_name}
            </div>
          </div>
        );
      })}
    </>
  );
};
