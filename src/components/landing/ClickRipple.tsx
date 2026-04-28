import { useEffect, useState } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Global subtle click ripple — soft circle that fades.
 * Mounts once at the page level. Pointer-events disabled so it never blocks UI.
 */
export const ClickRipple = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let id = 0;
    const handler = (e: PointerEvent) => {
      // Ignore non-primary buttons and synthetic events without coords
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      // Skip ripples on form fields & scrollable text inputs to keep things calm
      if (target && target.closest("input, textarea, [contenteditable='true']")) return;
      const next: Ripple = { id: ++id, x: e.clientX, y: e.clientY };
      setRipples((rs) => [...rs, next]);
      window.setTimeout(() => {
        setRipples((rs) => rs.filter((r) => r.id !== next.id));
      }, 600);
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute block rounded-full ripple-anim"
          style={{
            left: r.x,
            top: r.y,
          }}
        />
      ))}
      <style>{`
        .ripple-anim {
          width: 20px;
          height: 20px;
          background: rgba(var(--primary-rgb), 0.2);
          transform: translate(-50%, -50%) scale(0);
          animation: ripple-expand 0.6s linear forwards;
        }
        @keyframes ripple-expand {
          to {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
