import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, MessageSquare, MousePointer2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowcaseProps {
  onCta: () => void;
}

type Demo = "doc" | "notes" | "chat";

const DEMOS: { id: Demo; label: string; icon: typeof FileText; tag: string }[] = [
  { id: "doc", label: "Document", icon: FileText, tag: "Real-time editing" },
  { id: "notes", label: "Notes board", icon: MousePointer2, tag: "Drag, drop, brainstorm" },
  { id: "chat", label: "Chat", icon: MessageSquare, tag: "Talk in context" },
];

export const ProductShowcase = ({ onCta }: ShowcaseProps) => {
  const [active, setActive] = useState<Demo>("doc");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Reveal on scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-rotate demos
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      setActive((prev) => {
        const i = DEMOS.findIndex((d) => d.id === prev);
        return DEMOS[(i + 1) % DEMOS.length].id;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [visible]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 md:py-36">
      {/* Animated conic gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-60 dark:opacity-40 animate-spin-slow"
          style={{
            background:
              "conic-gradient(from 90deg at 50% 50%, hsl(var(--primary) / 0.18), hsl(var(--aurora) / 0.16), hsl(var(--iris) / 0.18), hsl(var(--primary-glow) / 0.20), hsl(var(--primary) / 0.18))",
            filter: "blur(80px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/40 to-background" />
      </div>

      {/* Floating orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[5%] top-[15%] h-32 w-32 rounded-full bg-primary/30 blur-3xl animate-float" />
        <div className="absolute right-[8%] top-[40%] h-40 w-40 rounded-full bg-aurora/25 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-[20%] bottom-[10%] h-36 w-36 rounded-full bg-iris/25 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <div className="container">
        {/* Header */}
        <div
          className={cn(
            "mx-auto max-w-3xl text-center transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 backdrop-blur px-3.5 py-1.5 text-xs font-medium shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-muted-foreground">See it in motion</span>
          </div>

          <h2 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Collaboration that
            <br />
            <span className="relative inline-block">
              <span
                className="bg-clip-text text-transparent animate-gradient"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, hsl(var(--primary)), hsl(var(--primary-glow)) 25%, hsl(var(--aurora)) 55%, hsl(var(--iris)) 80%, hsl(var(--primary)))",
                  backgroundSize: "300% 100%",
                }}
              >
                feels alive.
              </span>
            </span>
          </h2>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch ideas appear, cursors dance, and conversations flow — all on a single shared canvas.
          </p>
        </div>

        {/* Tab pills */}
        <div
          className={cn(
            "mt-12 flex justify-center transition-all duration-700 delay-100",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-1.5 shadow-soft">
            {DEMOS.map((d) => {
              const isActive = active === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setActive(d.id)}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-gradient-primary" />
                  )}
                  <d.icon className="relative h-4 w-4" />
                  <span className="relative">{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview frame */}
        <div
          className={cn(
            "relative mx-auto mt-12 max-w-5xl transition-all duration-1000 delay-200",
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
          )}
        >
          {/* Outer halo */}
          <div className="absolute -inset-x-12 -inset-y-8 bg-gradient-primary opacity-30 blur-3xl rounded-full" />
          <div className="absolute -inset-x-16 inset-y-16 bg-gradient-aurora opacity-20 blur-3xl rounded-full" />

          {/* Gradient border wrapper */}
          <div
            className="relative rounded-3xl p-px shadow-elevated-xl"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--aurora) / 0.4) 50%, hsl(var(--iris) / 0.5))",
            }}
          >
            <div className="rounded-3xl bg-card overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="ml-3 flex items-center gap-2 flex-1">
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    sync.app/r/team-launch
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-aurora/10 px-2 py-0.5 text-[10px] font-semibold text-aurora">
                    <span className="h-1 w-1 rounded-full bg-aurora animate-pulse-soft" />
                    LIVE
                  </span>
                </div>
                <div className="hidden sm:flex -space-x-2">
                  {[
                    { c: "#f97316", n: "M" },
                    { c: "#10b981", n: "T" },
                    { c: "#a855f7", n: "A" },
                    { c: "#f59e0b", n: "K" },
                  ].map((u, i) => (
                    <div
                      key={i}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white border-2 border-card shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${u.c}, ${u.c}cc)` }}
                    >
                      {u.n}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content area — switches between demos */}
              <div className="relative h-[420px] md:h-[480px] overflow-hidden">
                {DEMOS.map((d) => (
                  <div
                    key={d.id}
                    className={cn(
                      "absolute inset-0 transition-all duration-500",
                      active === d.id
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4 pointer-events-none"
                    )}
                  >
                    {d.id === "doc" && <DocDemo />}
                    {d.id === "notes" && <NotesDemo />}
                    {d.id === "chat" && <ChatDemo />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating stat badges */}
          <div className="hidden md:block">
            <div
              className={cn(
                "absolute -left-6 top-1/4 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-3 shadow-elevated transition-all duration-700 delay-500 animate-float",
                visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aurora/15 text-aurora">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sync delay</div>
                  <div className="font-display text-sm font-bold">&lt; 50ms</div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "absolute -right-6 bottom-1/4 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl p-3 shadow-elevated transition-all duration-700 delay-700 animate-float",
                visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              )}
              style={{ animationDelay: "2s" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Auto-saved</div>
                  <div className="font-display text-sm font-bold">just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA + social proof */}
        <div
          className={cn(
            "mt-16 flex flex-col items-center text-center transition-all duration-700 delay-300",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <Button variant="primary" size="xl" onClick={onCta} className="group">
            Try it now — it's free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex -space-x-1.5">
              {["#f97316", "#10b981", "#a855f7", "#f59e0b", "#06b6d4"].map((c, i) => (
                <div
                  key={i}
                  className="h-5 w-5 rounded-full border-2 border-background"
                  style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}
                />
              ))}
            </div>
            <span>Joined by teams shipping every day</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------- Demo panels ---------------- */

const DocDemo = () => (
  <div className="relative h-full grid grid-cols-1 md:grid-cols-[1fr_240px]">
    <div className="p-8 md:p-12 overflow-hidden">
      <div className="space-y-3 max-w-xl">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Q4 Launch Plan</div>
        <div className="h-8 w-3/4 rounded bg-foreground/85" />

        <div className="pt-2 space-y-2.5">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-11/12 rounded bg-muted" />
          <div className="h-3 w-4/6 rounded bg-muted" />

          {/* Typing line — animated */}
          <div className="flex items-center gap-1">
            <div className="h-3 rounded bg-gradient-to-r from-primary/50 to-primary-glow/40 animate-typing" style={{ width: "70%" }} />
            <span className="h-4 w-px bg-primary animate-pulse-soft" />
          </div>

          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>

        {/* Inline cursor flag */}
        <div className="absolute left-12 top-32 hidden md:flex items-center gap-1 animate-float" style={{ animationDelay: "0.5s" }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ color: "#10b981", fill: "#10b981", filter: "drop-shadow(0 2px 4px #10b98180)" }}>
            <path d="M3 3l7 17 2-7 7-2z" />
          </svg>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md" style={{ background: "linear-gradient(135deg, #10b981, #10b981dd)" }}>
            Theo
          </span>
        </div>
      </div>
    </div>

    {/* Outline sidebar */}
    <div className="hidden md:block border-l border-border/60 bg-muted/20 p-4">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Outline</div>
      <div className="space-y-2">
        {["Goals", "Timeline", "Team", "Risks"].map((s, i) => (
          <div
            key={s}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs transition-colors",
              i === 1 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NotesDemo = () => {
  const notes = [
    { x: 6, y: 8, c: "#fde68a", t: "Ship v2", r: -2 },
    { x: 32, y: 18, c: "#a7f3d0", t: "Hire 3 eng", r: 1 },
    { x: 58, y: 10, c: "#fbcfe8", t: "Brand refresh", r: -1 },
    { x: 14, y: 52, c: "#bfdbfe", t: "Customer interviews", r: 2 },
    { x: 44, y: 58, c: "#fed7aa", t: "Pricing page", r: -1 },
    { x: 70, y: 50, c: "#ddd6fe", t: "Demo video", r: 1.5 },
  ];
  return (
    <div className="relative h-full bg-dots">
      {notes.map((n, i) => (
        <div
          key={i}
          className="absolute w-36 rounded-xl shadow-elevated ring-1 ring-black/5 animate-float"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            background: `linear-gradient(135deg, ${n.c}, ${n.c}dd)`,
            transform: `rotate(${n.r}deg)`,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          <div className="flex gap-1 px-2 py-1.5">
            <div className="h-1 w-1 rounded-full bg-foreground/30" />
            <div className="h-1 w-1 rounded-full bg-foreground/30" />
            <div className="h-1 w-1 rounded-full bg-foreground/30" />
          </div>
          <div className="px-3 pb-3 text-xs font-semibold text-foreground/80">{n.t}</div>
        </div>
      ))}

      {/* Live cursor */}
      <div className="absolute left-[28%] top-[40%] flex items-center gap-1 transition-transform" style={{ animation: "cursor-drift 6s ease-in-out infinite" }}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ color: "#a855f7", fill: "#a855f7", filter: "drop-shadow(0 2px 4px #a855f780)" }}>
          <path d="M3 3l7 17 2-7 7-2z" />
        </svg>
        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md" style={{ background: "linear-gradient(135deg, #a855f7, #a855f7dd)" }}>
          Ana
        </span>
      </div>
    </div>
  );
};

const ChatDemo = () => {
  const messages = [
    { name: "Mira", color: "#f97316", text: "Loving the new layout 👀" },
    { name: "Theo", color: "#10b981", text: "Pushing copy now — feedback welcome" },
    { name: "Ana", color: "#a855f7", text: "+1 to the headline. The gradient is 🔥" },
    { name: "Kai", color: "#f59e0b", text: "Shipping the preview to staging" },
  ];
  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex-1 overflow-hidden p-6 md:p-8 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className="flex gap-3 max-w-md animate-fade-in-up"
            style={{ animationDelay: `${i * 200}ms`, animationFillMode: "backwards" }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` }}
            >
              {m.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold" style={{ color: m.color }}>{m.name}</span>
                <span className="text-[10px] text-muted-foreground">just now</span>
              </div>
              <div className="mt-1 inline-block rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-foreground/90">
                {m.text}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <div className="flex gap-3 max-w-md animate-fade-in" style={{ animationDelay: "1s", animationFillMode: "backwards" }}>
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #06b6d4, #06b6d4cc)" }}
          >
            S
          </div>
          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.2s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 p-3 bg-muted/20">
        <div className="flex items-center rounded-xl border border-input bg-background/80 px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground/70 flex-1">Message the room…</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12l14-7-7 14-2-5-5-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
