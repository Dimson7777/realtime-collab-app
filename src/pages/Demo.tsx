import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Check,
  Link2,
  MessageSquare,
  Sparkles,
  Activity as ActivityIcon,
  Users,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Demo room — fully client-side. No auth, no DB. Feels like a live   */
/* session in progress: typing, cursor movement, chat, activity feed. */
/* ------------------------------------------------------------------ */

type Member = { id: string; name: string; color: string; initials: string };

const MEMBERS: Member[] = [
  { id: "you", name: "You", color: "#f97316", initials: "YO" },
  { id: "mira", name: "Mira", color: "#10b981", initials: "MR" },
  { id: "theo", name: "Theo", color: "#a855f7", initials: "TH" },
  { id: "ana", name: "Ana", color: "#f59e0b", initials: "AN" },
];

const SEED_DOC = `# Q4 launch plan

Goal: ship the public beta to design partners by Friday.

## This week
- Finalize onboarding copy (Mira)
- Cut a build for design review (Theo)
- Send invite emails to the first 12 partners (Ana)

## Open questions
- Pricing for early adopters?
- Do we gate the dashboard behind verified email?

## Notes
`;

const TYPED_LINES = [
  "Pin the launch checklist to the top of this doc.",
  "Add Mira to the design review on Thursday.",
  "Move pricing card above the fold on landing.",
  "Schedule announcement tweet for Tue 9am ET.",
];

const SEED_CHAT = [
  { id: 1, who: "mira", msg: "Loving this layout 🙌" },
  { id: 2, who: "theo", msg: "Pushing the new copy now" },
  { id: 3, who: "ana", msg: "+1 to the headline change" },
];

const ROTATING_CHAT = [
  { who: "mira", msg: "Cursor labels look great" },
  { who: "theo", msg: "Synced — try a refresh" },
  { who: "ana", msg: "Pinning the brief above" },
  { who: "mira", msg: "Can we ship the dark theme too?" },
];

const ROTATING_ACTIVITY = [
  { who: "Theo", verb: "edited the doc" },
  { who: "Ana", verb: "added a note" },
  { who: "Mira", verb: "joined the room" },
  { who: "Theo", verb: "renamed a section" },
  { who: "Ana", verb: "pinned a checklist" },
];

const memberById = (id: string) => MEMBERS.find((m) => m.id === id) ?? MEMBERS[0];

/* Smooth wandering cursor — uses a few keyframe targets and CSS transitions. */
const useWanderingCursor = () => {
  const [pos, setPos] = useState({ x: 22, y: 38 });
  useEffect(() => {
    const targets = [
      { x: 22, y: 38 },
      { x: 58, y: 30 },
      { x: 70, y: 62 },
      { x: 35, y: 70 },
      { x: 45, y: 48 },
      { x: 18, y: 56 },
    ];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % targets.length;
      setPos(targets[i]);
    }, 1900);
    return () => clearInterval(t);
  }, []);
  return pos;
};

const Demo = () => {
  const navigate = useNavigate();
  const cursor = useWanderingCursor();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [doc, setDoc] = useState(SEED_DOC);
  const [chat, setChat] = useState(SEED_CHAT);
  const [chatInput, setChatInput] = useState("");
  const [activity, setActivity] = useState(
    ROTATING_ACTIVITY.slice(0, 3).map((a, i) => ({ ...a, id: i, t: `${(i + 1) * 2} min ago` })),
  );
  const [savedAt, setSavedAt] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [typedLine, setTypedLine] = useState("");
  const [typedComplete, setTypedComplete] = useState(false);

  /* Fake a remote teammate ("Theo") typing into the doc. */
  useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let mode: "typing" | "holding" | "erasing" = "typing";
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const target = TYPED_LINES[phraseIdx];
      if (mode === "typing") {
        charIdx += 1;
        setTypedLine(target.slice(0, charIdx));
        if (charIdx >= target.length) {
          mode = "holding";
          setTypedComplete(true);
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 55);
      } else if (mode === "holding") {
        mode = "erasing";
        setTypedComplete(false);
        timer = setTimeout(tick, 30);
      } else {
        charIdx -= 1;
        setTypedLine(target.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          phraseIdx = (phraseIdx + 1) % TYPED_LINES.length;
          mode = "typing";
        }
        timer = setTimeout(tick, 22);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  /* Rotating chat — new message arrives every few seconds. */
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      const next = ROTATING_CHAT[i % ROTATING_CHAT.length];
      setChat((c) => [...c, { ...next, id: Date.now() + i }].slice(-7));
      i += 1;
    }, 5200);
    return () => clearInterval(t);
  }, []);

  /* Rotating activity feed. */
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      const next = ROTATING_ACTIVITY[i % ROTATING_ACTIVITY.length];
      setActivity((a) => [{ ...next, id: Date.now() + i, t: "just now" }, ...a].slice(0, 5));
      i += 1;
    }, 6400);
    return () => clearInterval(t);
  }, []);

  /* Autosave shimmer when doc changes. */
  useEffect(() => {
    setSyncing(true);
    const t = setTimeout(() => {
      setSyncing(false);
      setSavedAt(new Date());
    }, 700);
    return () => clearTimeout(t);
  }, [doc]);

  const sendChat = () => {
    const v = chatInput.trim();
    if (!v) return;
    setChat((c) => [...c, { id: Date.now(), who: "you", msg: v }].slice(-7));
    setChatInput("");
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Demo link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/75 backdrop-blur-md sticky top-0 z-30">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/")}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="hidden sm:block h-5 w-px bg-border" />
            <Logo />
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-aurora/10 ring-1 ring-aurora/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-aurora">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora" />
              </span>
              Live demo
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Avatar stack */}
            <div className="hidden sm:flex -space-x-1.5 mr-1">
              {MEMBERS.map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background text-[10px] font-semibold text-white"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </span>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={copyInvite} className="hidden sm:inline-flex">
              <Link2 className="h-3.5 w-3.5" />
              Copy invite link
            </Button>
            <ThemeToggle />
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate("/auth?mode=signup")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create your room
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex-1 py-5 grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <main className="relative rounded-xl border border-border bg-card shadow-elevated overflow-hidden flex flex-col">
          {/* Doc toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-sm font-medium truncate">Q4 launch plan</div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Edited just now
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full rounded-full",
                      syncing ? "bg-primary/60 animate-ping" : "bg-aurora/60 animate-ping opacity-50",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-1.5 w-1.5 rounded-full",
                      syncing ? "bg-primary" : "bg-aurora",
                    )}
                  />
                </span>
                {syncing ? "Syncing changes…" : "All changes synced"}
              </div>
              <span className="hidden sm:inline text-border/70">•</span>
              <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Check className="h-3 w-3 text-aurora" strokeWidth={3} />
                Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* Editor body w/ wandering cursor overlay */}
          <div className="relative flex-1 min-h-[420px]">
            {/* Wandering remote cursor */}
            <div
              className="pointer-events-none absolute z-10 transition-all duration-[1700ms] ease-in-out"
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
              aria-hidden
            >
              <svg width="20" height="24" viewBox="0 0 20 24" className="drop-shadow">
                <path
                  d="M2 2 L18 12 L11 13 L8 21 Z"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className="ml-3 -mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ background: "#10b981" }}
              >
                Mira
              </div>
            </div>

            {/* Editable doc — user can actually type */}
            <textarea
              ref={editorRef}
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              spellCheck={false}
              className="block w-full h-full min-h-[420px] resize-none border-0 bg-transparent px-6 py-5 text-sm leading-relaxed text-foreground/90 font-mono outline-none focus:ring-0"
            />

            {/* Floating "Theo is typing" indicator on top of doc */}
            <div className="pointer-events-none absolute right-4 bottom-4 max-w-sm rounded-lg border border-border bg-card/95 backdrop-blur shadow-elevated px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] mb-1">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ background: "#a855f7" }}
                >
                  TH
                </span>
                <span className="font-semibold">Theo</span>
                <span className="text-muted-foreground">is editing</span>
                <span className="inline-flex items-center gap-0.5 ml-1">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-typing-dot" />
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
              <div className="text-xs text-foreground/80 font-mono min-h-[18px]">
                {typedLine}
                {!typedComplete && (
                  <span className="inline-block ml-0.5 h-3 w-[2px] bg-primary align-middle animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right rail */}
        <aside className="grid gap-4 content-start">
          {/* Online users */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                In the room
              </div>
              <span className="text-[10px] text-muted-foreground">{MEMBERS.length} online</span>
            </div>
            <ul className="mt-3 space-y-2">
              {MEMBERS.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 text-sm">
                  <span className="relative">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ background: m.color }}
                    >
                      {m.initials}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-aurora ring-2 ring-card" />
                  </span>
                  <span className="font-medium">{m.name}</span>
                  {m.id === "you" && (
                    <span className="text-[10px] text-muted-foreground">(you)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Activity feed */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ActivityIcon className="h-3.5 w-3.5" />
              Activity
            </div>
            <ul className="mt-3 space-y-2.5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs animate-fade-in-up">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                  <div className="leading-snug">
                    <span className="font-semibold">{a.who}</span>{" "}
                    <span className="text-muted-foreground">{a.verb}</span>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">{a.t}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Chat */}
          <div className="rounded-xl border border-border bg-card flex flex-col max-h-[360px]">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-aurora animate-pulse-soft" />
                {MEMBERS.length} online
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-2.5">
              {chat.map((c) => {
                const m = memberById(c.who);
                return (
                  <div key={c.id} className="text-xs animate-fade-in-up">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </span>
                      <span className="font-semibold" style={{ color: m.color }}>
                        {m.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-foreground/85 pl-5">{c.msg}</p>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
              className="p-3 border-t border-border flex items-center gap-2"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message…"
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!chatInput.trim()}
                className="h-8 px-2.5"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </aside>
      </div>

      {/* Bottom bar — clear conversion path */}
      <div className="border-t border-border bg-card/60 backdrop-blur">
        <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground">
            You're in a <span className="font-semibold text-foreground">demo room</span>.
            Edits live only in your browser.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
              Back to home
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate("/auth?mode=signup")}>
              Create your own room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
