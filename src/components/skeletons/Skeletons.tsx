import { cn } from "@/lib/utils";

/**
 * Shared shimmer block. Uses semantic muted token, not raw colors.
 */
export const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-muted/60",
      "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent",
      className
    )}
  />
);

/* ---------- Chat ---------- */
export const ChatSkeleton = () => (
  <div className="flex flex-col gap-5 px-4 py-5">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3" style={{ animationDelay: `${i * 80}ms` }}>
        <SkeletonBlock className="h-7 w-7 flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-2.5 w-12 opacity-60" />
          </div>
          <SkeletonBlock className={cn("h-3", i % 2 === 0 ? "w-4/5" : "w-3/5")} />
          {i % 3 === 0 && <SkeletonBlock className="h-3 w-2/5" />}
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Notes board ---------- */
export const NotesSkeleton = () => {
  const positions = [
    { l: "8%", t: "12%", r: -2 },
    { l: "38%", t: "22%", r: 1.5 },
    { l: "65%", t: "10%", r: -1 },
    { l: "20%", t: "55%", r: 2 },
    { l: "55%", t: "60%", r: -2.5 },
  ];
  return (
    <div className="relative h-full w-full">
      {positions.map((p, i) => (
        <div
          key={i}
          className="absolute w-52"
          style={{
            left: p.l,
            top: p.t,
            transform: `rotate(${p.r}deg)`,
            animation: `scale-in 0.3s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms backwards`,
          }}
        >
          <div className="rounded-xl bg-muted/60 p-3 shadow-soft ring-1 ring-border/40">
            <div className="flex items-center justify-between pb-2">
              <SkeletonBlock className="h-1.5 w-8" />
              <SkeletonBlock className="h-2 w-2 rounded-full" />
            </div>
            <SkeletonBlock className="h-2.5 w-4/5" />
            <SkeletonBlock className="mt-2 h-2.5 w-3/5" />
            <SkeletonBlock className="mt-2 h-2.5 w-2/3" />
            <SkeletonBlock className="mt-6 h-2 w-1/3 opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Document ---------- */
export const DocSkeleton = () => (
  <div className="mx-auto h-full w-full max-w-3xl px-6 py-14 md:px-14 md:py-24">
    <div className="space-y-4">
      <SkeletonBlock className="h-6 w-2/3" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-[92%]" />
      <SkeletonBlock className="h-4 w-[78%]" />
      <div className="h-4" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-[88%]" />
      <SkeletonBlock className="h-4 w-[55%]" />
      <div className="h-4" />
      <SkeletonBlock className="h-4 w-[95%]" />
      <SkeletonBlock className="h-4 w-[72%]" />
    </div>
  </div>
);

/* ---------- Activity ---------- */
export const ActivitySkeleton = () => (
  <div className="px-3 py-3 space-y-3">
    <SkeletonBlock className="h-2.5 w-16" />
    <ol className="relative space-y-3 pl-2">
      <span aria-hidden className="absolute left-[14px] top-1 bottom-1 w-px bg-border/70" />
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-start gap-3" style={{ animationDelay: `${i * 60}ms` }}>
          <SkeletonBlock className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className={cn("h-3", i % 2 ? "w-3/4" : "w-2/3")} />
            <SkeletonBlock className="h-2.5 w-16 opacity-60" />
          </div>
        </li>
      ))}
    </ol>
  </div>
);

/* ---------- Members ---------- */
export const MembersSkeleton = () => (
  <ul className="px-2 py-3 space-y-2">
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="flex items-center gap-3 px-2 py-2">
        <SkeletonBlock className="h-7 w-7 flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-3 w-1/3" />
          <SkeletonBlock className="h-2.5 w-16 opacity-60" />
        </div>
        <SkeletonBlock className="h-5 w-14 rounded-md opacity-60" />
      </li>
    ))}
  </ul>
);

/* ---------- Version history ---------- */
export const VersionHistorySkeleton = () => (
  <ul className="p-2 space-y-1.5">
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="rounded-lg border border-border/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-2.5 w-32 opacity-60" />
          </div>
          <SkeletonBlock className="h-7 w-7 rounded-full" />
        </div>
        <SkeletonBlock className="mt-2 h-2.5 w-20 opacity-60" />
      </li>
    ))}
  </ul>
);

/* ---------- Room (full page) ---------- */
export const RoomSkeleton = () => (
  <div className="flex h-screen flex-col bg-background">
    {/* Header */}
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBlock className="hidden md:block h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-9 w-20 rounded-md" />
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
      </div>
    </div>
    {/* Tabs */}
    <div className="flex items-center justify-center border-b border-border/60 bg-card/40 px-4 py-3">
      <SkeletonBlock className="h-10 w-64 rounded-xl" />
    </div>
    {/* Body */}
    <div className="flex flex-1 min-h-0">
      <div className="flex-1">
        <DocSkeleton />
      </div>
      <div className="hidden md:block w-80 border-l border-border/60 bg-card/60">
        <div className="border-b border-border/60 px-4 py-4">
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <ChatSkeleton />
      </div>
    </div>
  </div>
);

/* ---------- Dashboard cards ---------- */
export const RoomCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
    <SkeletonBlock className="h-20 rounded-none" />
    <div className="p-5 -mt-6">
      <SkeletonBlock className="h-12 w-12 rounded-xl ring-4 ring-card" />
      <div className="mt-3 space-y-2">
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3 opacity-60" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
        <SkeletonBlock className="h-3 w-20 opacity-60" />
        <SkeletonBlock className="h-3 w-12 opacity-60" />
      </div>
    </div>
  </div>
);
