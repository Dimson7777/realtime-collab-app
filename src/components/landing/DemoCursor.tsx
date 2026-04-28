import { useEffect, useState } from "react";

interface Point {
  x: number; // %
  y: number; // %
}

const PATH: Point[] = [
  { x: 14, y: 22 },
  { x: 48, y: 30 },
  { x: 62, y: 50 },
  { x: 38, y: 64 },
  { x: 22, y: 72 },
  { x: 30, y: 42 },
];

interface DemoCursorProps {
  color?: string;
  name?: string;
}

/**
 * Slow-moving fake cursor for the hero demo. Pure CSS transitions —
 * no per-frame work, no layout thrash.
 */
export const DemoCursor = ({ color = "#f97316", name = "Mira" }: DemoCursorProps) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PATH.length), 1200);
    return () => clearInterval(t);
  }, []);

  const p = PATH[i];

  return (
    <div
      className="pointer-events-none absolute z-30 transition-all duration-[1100ms] ease-in-out drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
      aria-hidden
    >
      <svg width="20" height="24" viewBox="0 0 14 18" fill="none">
        <path
          d="M1 1L12 9L7 10.5L9.5 16L7 17L4.5 11.5L1 14V1Z"
          fill={color}
          stroke="white"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-5 top-5 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
        style={{ background: color }}
      >
        {name}
      </span>
    </div>
  );
};
