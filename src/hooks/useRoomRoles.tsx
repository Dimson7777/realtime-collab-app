import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type RoomRole = "owner" | "editor" | "viewer";

interface RoomRoleRow {
  user_id: string;
  role: RoomRole;
}

/**
 * Loads role membership for a room, exposes the current user's role,
 * and auto-self-joins the user as a "viewer" if they aren't a member yet
 * (e.g. opening a shared room link). Realtime keeps the membership map fresh.
 */
export const useRoomRoles = (roomId: string | undefined) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Map<string, RoomRole>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("room_roles")
        .select("user_id, role")
        .eq("room_id", roomId);
      if (cancelled) return;
      const map = new Map<string, RoomRole>();
      ((data || []) as RoomRoleRow[]).forEach((r) => map.set(r.user_id, r.role));

      // Auto self-join as viewer if not a member yet.
      if (!map.has(user.id)) {
        const { error } = await supabase
          .from("room_roles")
          .insert({ room_id: roomId, user_id: user.id, role: "viewer" });
        if (!error) map.set(user.id, "viewer");
      }
      setRoles(map);
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel(`roles-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_roles", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setRoles((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as RoomRoleRow;
              next.delete(old.user_id);
            } else {
              const row = payload.new as RoomRoleRow;
              next.set(row.user_id, row.role);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const myRole = (user && roles.get(user.id)) || null;
  const canEdit = myRole === "owner" || myRole === "editor";
  const isOwner = myRole === "owner";

  const setRole = async (targetUserId: string, role: RoomRole) => {
    if (!roomId) return { error: new Error("No room") };
    return supabase
      .from("room_roles")
      .upsert({ room_id: roomId, user_id: targetUserId, role }, { onConflict: "room_id,user_id" });
  };

  const removeMember = async (targetUserId: string) => {
    if (!roomId) return { error: new Error("No room") };
    return supabase
      .from("room_roles")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", targetUserId);
  };

  return { roles, myRole, canEdit, isOwner, loading, setRole, removeMember };
};
