import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  Users,
  MessageSquare,
  Zap,
  Check,
  Gauge,
  Rocket,
  DoorOpen,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClickRipple } from "@/components/landing/ClickRipple";
import { LivePresencePill } from "@/components/landing/LivePresencePill";
import { DemoCursor } from "@/components/landing/DemoCursor";

// Rotates through values on a fixed interval. Pause-friendly, no SSR issues.
const useRotate = <T,>(items: T[], intervalMs = 3200): T => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [items.length, intervalMs]);
  return items[i];
};

// Loops through phrases, typing out each one then erasing — for the demo doc line.
const useTypewriter = (phrases: string[], typeMs = 55, holdMs = 1400, eraseMs = 28) => {
  const [text, setText] = useState("");
  useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let mode: "typing" | "holding" | "erasing" = "typing";
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const target = phrases[phraseIdx];
      if (mode === "typing") {
        charIdx += 1;
        setText(target.slice(0, charIdx));
        if (charIdx >= target.length) {
          mode = "holding";
          timer = setTimeout(tick, holdMs);
          return;
        }
        timer = setTimeout(tick, typeMs);
      } else if (mode === "holding") {
        mode = "erasing";
        timer = setTimeout(tick, eraseMs);
      } else {
        charIdx -= 1;
        setText(target.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          phraseIdx = (phraseIdx + 1) % phrases.length;
          mode = "typing";
        }
        timer = setTimeout(tick, eraseMs);
      }
    };
    timer = setTimeout(tick, typeMs);
    return () => clearTimeout(timer);
  }, [phrases, typeMs, holdMs, eraseMs]);
  return text;
};

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const docTitle = useRotate(
    ["Q4 launch plan", "Sprint 24 retro", "Brand workshop", "Client kickoff"],
    3400,
  );
  const liveChat = useRotate(
    [
      { name: "Mira", color: "#f97316", msg: "Loving this layout" },
      { name: "Theo", color: "#10b981", msg: "Pushing copy now" },
      { name: "Ana", color: "#f59e0b", msg: "+1 to the headline" },
      { name: "Kai", color: "#a855f7", msg: "Pinning the brief" },
      { name: "Mira", color: "#f97316", msg: "Cursor labels look great" },
    ],
    2800,
  );
  const typedLine = useTypewriter(
    [
      "Ship beta to design partners by Friday",
      "Block 30 min for retro after standup",
      "Move pricing card above the fold",
      "Schedule launch announcement for Tue 9am",
    ],
    38, // typeMs — faster, clearly visible
    900, // holdMs
    18, // eraseMs
  );

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  // Transparent → blurred navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ClickRipple />

      {/* Nav — transparent at top, glassy on scroll */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-border bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-[0_1px_0_hsl(var(--border)/0.6)]"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container flex h-14 items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex"
            >
              Sign in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Soft hero backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-90" />
        {/* Slow-drifting ambient layer */}
        <div
          className="pointer-events-none absolute inset-0 hero-drift"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 30% 20%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(ellipse 50% 60% at 75% 30%, hsl(var(--iris) / 0.06), transparent 60%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container relative pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center animate-fade-in">
              <LivePresencePill />
            </div>

            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl animate-fade-in-up">
              Start a shared workspace
              <br className="hidden sm:block" />
              <span className="text-gradient">in seconds.</span>
            </h1>

            <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up delay-100">
              Create a room, share a link, and collaborate instantly — no setup, no friction.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row animate-fade-in-up delay-200">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="group hover:scale-[1.02] active:scale-[0.98]"
              >
                Start a room
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/demo")}
                className="group active:scale-[0.98]"
              >
                <span className="relative flex h-1.5 w-1.5 mr-0.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                </span>
                Try live demo
                <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground/80 animate-fade-in-up delay-300">
              No signup required · Opens a real demo room instantly
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70 animate-fade-in-up delay-300">
              Used for real-time planning, feedback, and team sessions.
            </p>
          </div>

          {/* Live session preview label */}
          <div className="mt-10 flex items-center justify-center gap-2 animate-fade-in-up delay-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Live session preview · see how teams collaborate
            </span>
          </div>

          {/* Preview card */}
          <div className="relative mx-auto mt-4 max-w-6xl animate-fade-in-up delay-400">
            {/* Soft glow under preview */}
            <div className="pointer-events-none absolute -inset-x-8 -bottom-8 top-8 bg-gradient-primary opacity-[0.14] blur-3xl rounded-3xl" />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-elevated-xl transition-all duration-500 hover:shadow-[0_24px_60px_-20px_hsl(20_30%_15%/0.25)] hover:-translate-y-0.5">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-warning/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-aurora/50" />
                </div>
                <div className="ml-3 flex-1 text-xs text-muted-foreground font-mono truncate">
                  sync.app/r/team-launch
                </div>

                {/* Live status pill */}
                <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                  </span>
                  Live sync active
                </div>

                <div className="ml-2 flex -space-x-1.5">
                  {[
                    { c: "#f97316", n: "M" },
                    { c: "#10b981", n: "T" },
                    { c: "#f59e0b", n: "A" },
                    { c: "#a855f7", n: "K" },
                  ].map((u, i) => (
                    <div key={i} className="relative">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold text-white"
                        style={{ background: u.c }}
                        title={u.n}
                      >
                        {u.n}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-aurora ring-2 ring-card animate-pulse-soft"
                        style={{ animationDelay: `${i * 220}ms` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">
                <div className="relative p-7">
                  <DemoCursor color="#f97316" name="Mira" />
                  {/* Document header w/ "Saved" + sync status */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div
                        key={docTitle}
                        className="text-xs font-medium text-foreground/90 animate-fade-in"
                      >
                        {docTitle}
                      </div>
                      <span className="text-[10px] text-muted-foreground/70">
                        Edited just now
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-50" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                        </span>
                        All changes synced
                      </div>
                      <span className="text-border/70">•</span>
                      <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Check className="h-3 w-3 text-aurora" strokeWidth={3} />
                        Saved
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="h-6 w-2/3 rounded bg-foreground/80" />
                    <div className="h-2.5 w-full rounded bg-muted" />
                    <div className="h-2.5 w-5/6 rounded bg-muted" />
                    <div className="h-2.5 w-4/6 rounded bg-muted" />
                    {/* Active typed line — clearly visible activity */}
                    <div className="relative rounded-md bg-primary/15 ring-2 ring-primary/40 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] px-2.5 py-2 text-xs font-medium text-foreground min-h-[32px] flex items-center transition-all">
                      <span>{typedLine}</span>
                      <span className="ml-0.5 inline-block h-3.5 w-[2px] bg-primary animate-pulse" />
                      <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground shadow">
                        Theo is typing
                        <span className="inline-flex items-center gap-0.5 ml-0.5">
                          <span className="h-1 w-1 rounded-full bg-primary-foreground/90 animate-typing-dot" />
                          <span
                            className="h-1 w-1 rounded-full bg-primary-foreground/90 animate-typing-dot"
                            style={{ animationDelay: "180ms" }}
                          />
                          <span
                            className="h-1 w-1 rounded-full bg-primary-foreground/90 animate-typing-dot"
                            style={{ animationDelay: "360ms" }}
                          />
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-3/4 rounded bg-muted" />
                  </div>
                  <div className="mt-7 grid grid-cols-3 gap-2.5">
                    {[
                      { t: "Ship v2" },
                      { t: "Hire 3 eng" },
                      { t: "Brand" },
                    ].map((n) => (
                      <div
                        key={n.t}
                        className="rounded-md border border-border bg-muted/40 p-2.5 text-xs font-medium text-foreground/80 transition-all duration-200 hover:bg-muted hover:-translate-y-0.5"
                      >
                        {n.t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden border-l border-border bg-muted/20 p-4 md:block">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Chat
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-aurora animate-pulse-soft" />
                      4 online
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {[
                      { name: "Mira", color: "#f97316", msg: "Loving this layout" },
                      { name: "Theo", color: "#10b981", msg: "Pushing copy now" },
                      { name: "Ana", color: "#f59e0b", msg: "+1 to the headline" },
                    ].map((m, i) => (
                      <div
                        key={m.name}
                        className="text-xs animate-fade-in-up"
                        style={{
                          animationDelay: `${500 + i * 220}ms`,
                          animationFillMode: "backwards",
                        }}
                      >
                        <span
                          className="font-semibold"
                          style={{ color: m.color }}
                        >
                          {m.name}
                        </span>
                        <p className="mt-0.5 text-foreground/80">{m.msg}</p>
                      </div>
                    ))}

                    {/* Live rotating message — feels like new chats arriving */}
                    <div key={liveChat.name + liveChat.msg} className="text-xs animate-fade-in-up">
                      <span className="font-semibold" style={{ color: liveChat.color }}>
                        {liveChat.name}
                      </span>
                      <p className="mt-0.5 text-foreground/80">{liveChat.msg}</p>
                    </div>

                    {/* Live typing indicator */}
                    <div
                      className="flex items-center gap-1.5 pt-1 animate-fade-in"
                      style={{
                        animationDelay: "1400ms",
                        animationFillMode: "backwards",
                      }}
                      aria-label="Kai is typing"
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Kai is typing
                      </span>
                      <span className="inline-flex items-center gap-0.5 ml-1">
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-typing-dot"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-typing-dot"
                          style={{ animationDelay: "180ms" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-typing-dot"
                          style={{ animationDelay: "360ms" }}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live room previews — make the product feel inhabited */}
      <section className="border-t border-border bg-gradient-subtle">
        <div className="container py-14 md:py-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                </span>
                Active right now
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Teams are collaborating right now.
              </h2>
            </div>
            <p className="hidden md:block text-xs text-muted-foreground">
              Sample rooms — yours opens in one click.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Startup planning",
                edited: "2 min ago",
                active: 4,
                accent: "from-primary/15 to-transparent",
                avatars: [
                  { i: "MR", c: "#f97316" },
                  { i: "TK", c: "#10b981" },
                  { i: "AN", c: "#f59e0b" },
                  { i: "KP", c: "#a855f7" },
                ],
                preview: ["Roadmap Q4", "OKR draft", "Hiring plan"],
              },
              {
                name: "Client feedback",
                edited: "just now",
                active: 3,
                accent: "from-aurora/15 to-transparent",
                avatars: [
                  { i: "SL", c: "#06b6d4" },
                  { i: "JR", c: "#ec4899" },
                  { i: "MT", c: "#8b5cf6" },
                ],
                preview: ["Round 2 notes", "Approved copy", "Open questions"],
              },
              {
                name: "Sprint board",
                edited: "5 min ago",
                active: 5,
                accent: "from-iris/15 to-transparent",
                avatars: [
                  { i: "DK", c: "#10b981" },
                  { i: "PA", c: "#f59e0b" },
                  { i: "VS", c: "#6366f1" },
                  { i: "LN", c: "#ef4444" },
                  { i: "BC", c: "#14b8a6" },
                ],
                preview: ["In progress · 7", "Review · 3", "Done · 12"],
              },
            ].map((r, i) => (
              <button
                key={r.name}
                onClick={() => navigate("/demo")}
                className="group relative text-left overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-primary/30 hover:shadow-elevated active:scale-[0.99] animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className={cn("pointer-events-none absolute -inset-px rounded-lg bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100", r.accent)} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium transition-colors group-hover:text-primary">
                        {r.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Edited {r.edited}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-aurora/10 ring-1 ring-aurora/20 px-1.5 py-0.5 text-[10px] font-medium text-aurora">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                      </span>
                      Live
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {r.preview.map((line) => (
                      <div
                        key={line}
                        className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-[11px] text-foreground/80"
                      >
                        {line}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {r.avatars.slice(0, 4).map((a, k) => (
                          <span
                            key={k}
                            className="flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card text-[9px] font-semibold text-white"
                            style={{ background: a.c }}
                          >
                            {a.i}
                          </span>
                        ))}
                        {r.avatars.length > 4 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[9px] font-semibold text-muted-foreground">
                            +{r.avatars.length - 4}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {r.active} active
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                      Open <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>


      <section id="features" className="border-t border-border scroll-mt-20">
        <div className="container py-20 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Features
            </div>
            <p className="mt-4 text-sm font-medium text-primary">
              Everything you need to collaborate in real time.
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Built for the way teams actually work.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              A focused set of tools that make collaboration feel effortless —
              no clutter, no learning curve.
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              Tested in real sessions with small teams working on planning, feedback, and brainstorming.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "See edits as your team types",
                desc: "Every keystroke shows up live, with cursor labels so you always know who's editing what.",
                meta: "Used in active sessions right now",
                tag: "Live",
                featured: true,
                offset: "lg:-translate-y-2",
              },
              {
                icon: Users,
                title: "Jump into a room in seconds",
                desc: "Share a link — no installs, no accounts. Anyone with it can start collaborating instantly.",
                meta: "Average join time: under 4 seconds",
                tag: "Realtime",
                featured: false,
                offset: "lg:translate-y-1",
              },
              {
                icon: Rocket,
                title: "No setup. No onboarding.",
                desc: "Open a room, start typing. Your workspace is ready before the page finishes loading.",
                meta: "Zero config — works in any browser",
                tag: "Active",
                featured: false,
                offset: "lg:-translate-y-1",
              },
              {
                icon: Gauge,
                title: "Stays fast under pressure",
                desc: "Sync stays snappy with dozens in a room. Edits land in milliseconds, not seconds.",
                meta: "P95 sync latency under 80ms",
                tag: "Stable",
                featured: false,
                offset: "lg:translate-y-2",
              },
            ].map((f) => (
              <div
                key={f.title}
                className={cn(
                  "group relative rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-elevated hover:border-primary/30 active:scale-[0.99]",
                  f.offset,
                  f.featured && "ring-1 ring-primary/20 shadow-glow"
                )}
              >
                {/* Soft gradient glow */}
                <div className={cn(
                  "pointer-events-none absolute -inset-px rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-transparent transition-opacity duration-300",
                  f.featured ? "opacity-70" : "opacity-0 group-hover:opacity-60"
                )} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted ring-1 ring-border transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                      <f.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-aurora/10 ring-1 ring-aurora/20 px-1.5 py-0.5 text-[10px] font-medium text-aurora">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                      </span>
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-sm font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                  <p className="mt-3 text-[11px] text-muted-foreground/70">
                    {f.meta}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary feature row — keeps existing surface area */}
          <div className="mt-4 grid gap-px bg-border md:grid-cols-3 rounded-lg overflow-hidden border border-border">
            {[
              {
                icon: MessageSquare,
                title: "Built-in chat",
                desc: "Talk in context without leaving your workspace.",
              },
              {
                icon: Sparkles,
                title: "Version history",
                desc: "Snapshot, restore, and never lose work.",
              },
              {
                icon: Users,
                title: "Live presence",
                desc: "See who's in the room with avatars and cursors.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-card p-6 transition-all duration-200 hover:bg-accent/40"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted ring-1 ring-border transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                  <f.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border scroll-mt-20 bg-gradient-subtle">
        <div className="container py-20 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              How it works
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Up and running in three steps.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              No installs. No accounts to wrangle. Just a room and a link.
            </p>
          </div>

          <div className="relative mt-12 max-w-4xl mx-auto">
            {/* Connector line — desktop only */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-[68px] hidden md:block"
            >
              <div className="mx-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
            <div className="relative grid gap-4 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: DoorOpen,
                  title: "Create a room",
                  desc: "One click. Your shared workspace is ready in seconds.",
                },
                {
                  step: "02",
                  icon: UserPlus,
                  title: "Invite others",
                  desc: "Share the link. Anyone with it can jump straight in.",
                },
                {
                  step: "03",
                  icon: Zap,
                  title: "Start collaborating",
                  desc: "Write, chat, and brainstorm together in real time.",
                },
              ].map((s, i) => (
                <div
                  key={s.step}
                  className="group relative rounded-lg border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-elevated hover:border-primary/30 active:scale-[0.99]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="pointer-events-none absolute -inset-px rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20 text-primary transition-transform duration-300 group-hover:scale-110">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <span className="font-display text-2xl font-semibold tracking-tight text-muted-foreground/40 transition-colors duration-300 group-hover:text-primary">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="mt-5 text-sm font-medium transition-colors group-hover:text-primary">{s.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border scroll-mt-20">
        <div className="container py-20 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pricing
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Simple pricing.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Start free. Upgrade when you're ready.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto items-start">
            {/* Free */}
            <div className="rounded-lg border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated md:translate-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Free
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground">/ forever</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                For trying things out.
              </p>
              <Button
                variant="outline"
                size="default"
                className="mt-6 w-full"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Start free
              </Button>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Up to 3 rooms",
                  "Real-time collaboration",
                  "Live presence & chat",
                  "Sticky notes board",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check
                      className="h-3.5 w-3.5 text-foreground/60"
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro — featured */}
            <div className="relative rounded-lg border border-primary/30 bg-card p-7 ring-1 ring-primary/20 shadow-glow transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-elevated active:scale-[0.99]">
              <div className="pointer-events-none absolute -inset-px rounded-lg bg-gradient-to-br from-primary/15 via-transparent to-aurora/10 opacity-90" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-primary">
                    Pro
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-primary to-primary-glow px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
                    <Sparkles className="h-2.5 w-2.5" />
                    Most teams upgrade
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-semibold">$9</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  For teams that collaborate at scale.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-aurora">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
                  </span>
                  Active teams using Pro right now
                </div>
                <Button
                  variant="primary"
                  size="default"
                  className="mt-6 w-full shadow-glow hover:scale-[1.01]"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Get started with Pro
                </Button>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Unlimited rooms",
                    "Priority real-time sync",
                    "Live cursors with labels",
                    "Auto-save with history",
                    "Premium support",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-foreground/85"
                    >
                      <Check
                        className="h-3.5 w-3.5 text-primary"
                        strokeWidth={2.5}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why this exists — honest, human */}
      <section className="border-t border-border bg-gradient-subtle">
        <div className="container py-20 md:py-24">
          <div className="mx-auto max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Why this exists
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Most tools kill the moment.
            </h2>
            <div className="mt-6 space-y-4 text-base text-muted-foreground leading-relaxed">
              <p>
                Someone has an idea. You want to work on it together — right now.
              </p>
              <p>
                Instead, you spend ten minutes inviting people, picking a
                workspace, naming a doc, fixing permissions. By the time
                everyone's in, half the room has lost the thread.
              </p>
              <p className="text-foreground/85">
                One room. One link. You're already working.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="border-t border-border">
        <div className="container py-20 md:py-24">
          <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[180px_1fr] md:items-start">
            <div className="relative mx-auto md:mx-0">
              <div className="absolute -inset-2 rounded-full bg-gradient-primary opacity-25 blur-xl" />
              <img
                src={new URL("../assets/founder.png", import.meta.url).href}
                alt="Portrait of the developer who built Sync"
                loading="lazy"
                className="relative h-32 w-32 md:h-40 md:w-40 rounded-full object-cover ring-2 ring-border shadow-elevated"
              />
              <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full bg-card border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-aurora animate-pulse-soft" />
                Online
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Built by a developer who needed this
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                I built this because nothing else got out of the way.
              </h2>
              <div className="mt-5 space-y-3.5 text-sm md:text-base text-muted-foreground leading-relaxed">
                <p>
                  I'm a developer. Most weeks I jump on quick calls to plan a
                  sprint, review work with a friend, or sketch an idea with a
                  client.
                </p>
                <p>
                  Every time, the same thing happened. Pick a tool. Make an
                  account. Create a workspace. Invite. Wait. Reload. By the
                  time we were both staring at the same page, the energy was
                  gone.
                </p>
                <p>
                  I just wanted a room I could open and share. So I built one.
                </p>
                <p>
                  I use it for planning, design feedback, and quick brainstorms
                  with two or three people. It's the thing I open when I don't
                  want to think about the tool.
                </p>
                <p className="text-foreground/85">
                  No accounts to share. No setup screen. Click the link, you're in.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => navigate("/demo")}
                  className="group hover:scale-[1.02] active:scale-[0.98]"
                >
                  Try the live demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Create an account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section id="about" className="border-t border-border scroll-mt-20">
        <div className="container py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Open a room. Invite anyone.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Sync is built for teams that would rather create than configure.
              No setup, no friction — just instant, real-time collaboration.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/auth?mode=signup")}
              className="mt-8 group hover:scale-[1.02]"
            >
              Start collaborating
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Free to start. No credit card needed.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-xs text-muted-foreground sm:flex-row">
          <Logo />
          <div>© {new Date().getFullYear()} Sync. Built for teams that move fast.</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
