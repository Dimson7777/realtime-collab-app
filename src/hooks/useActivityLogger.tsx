import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActivityAction =
  | "joined"
  | "edited_doc"
  | "added_note"
  | "deleted_note"
  | "sent_message"
  | "restored_version"
  | "created_version";

interface LogOptions {
  /** If set, suppress duplicate `action` events within this many ms. */
  throttleMs?: number;
}

/**
 * Lightweight client-side logger for room activity.
 * - Snapshots the current user's display name + color so the timeline
 *   stays readable even if profile data later changes.
 * - Throttles bursty actions (e.g. "edited_doc" while typing).
 */
export const useActivityLogger = (roomId: string) => {
  const { user, profile } = useAuth();
  const lastByActionRef = useRef<Map<string, number>>(new Map());

  const log = useCallback(
    async (action: ActivityAction, detail?: string, opts?: LogOptions) => {
      if (!user || !roomId) return;
      if (opts?.throttleMs) {
        const last = lastByActionRef.current.get(action) ?? 0;
        const now = Date.now();
        if (now - last < opts.throttleMs) return;
        lastByActionRef.current.set(action, now);
      }
      await supabase.from("room_activity").insert({
        room_id: roomId,
        user_id: user.id,
        user_name: profile?.display_name ?? null,
        user_color: profile?.avatar_color ?? null,
        action,
        detail: detail ?? null,
      });
    },
    [roomId, user, profile?.display_name, profile?.avatar_color]
  );

  return { log };
};
