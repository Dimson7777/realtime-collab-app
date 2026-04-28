import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight Web Audio synth — no assets needed.
 * Generates short, subtle UI feedback tones.
 */

const STORAGE_KEY = "sync:sound-muted";

type SoundName =
  | "tap"        // button press
  | "send"       // message sent
  | "pop"        // sticky note added
  | "swoosh"     // panel open / tab switch
  | "success"    // saved / completed
  | "soft-click" // ambient click feedback
  | "delete";    // remove

let _ctx: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  try {
    _ctx = new Ctx();
    return _ctx;
  } catch {
    return null;
  }
};

const playTone = (
  freq: number,
  duration = 0.08,
  type: OscillatorType = "sine",
  volume = 0.04,
  freqEnd?: number
) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
  // Soft attack/decay envelope
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
};

const SOUND_MAP: Record<SoundName, () => void> = {
  tap: () => playTone(620, 0.05, "sine", 0.025, 580),
  send: () => {
    playTone(680, 0.06, "sine", 0.035, 920);
    setTimeout(() => playTone(980, 0.05, "sine", 0.025, 1180), 35);
  },
  pop: () => playTone(540, 0.09, "triangle", 0.04, 880),
  swoosh: () => playTone(380, 0.11, "sine", 0.025, 720),
  success: () => {
    playTone(700, 0.07, "sine", 0.03, 880);
    setTimeout(() => playTone(1040, 0.09, "sine", 0.03, 1240), 60);
  },
  "soft-click": () => playTone(440, 0.04, "sine", 0.018, 380),
  delete: () => playTone(320, 0.1, "triangle", 0.035, 180),
};

let _muted: boolean | null = null;
const readMuted = () => {
  if (_muted !== null) return _muted;
  try {
    _muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    _muted = false;
  }
  return _muted;
};

const writeMuted = (v: boolean) => {
  _muted = v;
  try {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
};

const listeners = new Set<(v: boolean) => void>();

export const useSound = () => {
  const [muted, setMutedState] = useState<boolean>(() => readMuted());
  const lastPlayRef = useRef<Map<SoundName, number>>(new Map());

  useEffect(() => {
    const cb = (v: boolean) => setMutedState(v);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    if (readMuted()) return;
    // Throttle the same sound to avoid sonic spam
    const now = performance.now();
    const last = lastPlayRef.current.get(name) ?? 0;
    if (now - last < 40) return;
    lastPlayRef.current.set(name, now);
    SOUND_MAP[name]();
  }, []);

  const setMuted = useCallback((v: boolean) => {
    writeMuted(v);
    listeners.forEach((cb) => cb(v));
  }, []);

  const toggleMuted = useCallback(() => setMuted(!readMuted()), [setMuted]);

  return { play, muted, setMuted, toggleMuted };
};

export type { SoundName };
