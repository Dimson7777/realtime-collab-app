import { useEffect, useState } from "react";

const PRESENCE_USERS = [
  { name: "Mira", color: "#f97316" },
  { name: "Theo", color: "#10b981" },
  { name: "Ana", color: "#a855f7" },
];

/**
 * Subtle "X people online now" pill with overlapping avatars.
 * Avatars stagger-fade in, dot pulses gently.
 */
export const LivePresencePill = () => {
  const [count, setCount] = useState(3);

  // Occasionally tick the count (3 ↔ 4) so it feels alive without being noisy
  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => (c === 3 ? 4 : 3));
    }, 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
      <div className="flex -space-x-1.5">
        {PRESENCE_USERS.map((u, i) => (
          <div
            key={u.name}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-card animate-fade-in"
            style={{
              background: u.color,
              animationDelay: `${i * 120}ms`,
              animationFillMode: "backwards",
            }}
            title={u.name}
          >
            {u.name[0]}
          </div>
        ))}
      </div>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
      </span>
      <span className="tabular-nums">{count} people online now</span>
    </div>
  );
};
