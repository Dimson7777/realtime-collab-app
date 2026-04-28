import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "online" | "reconnecting" | "offline";

/**
 * Tracks combined browser online + Supabase realtime status.
 * - "offline": browser navigator.onLine === false
 * - "reconnecting": browser online, but realtime channel is not yet SUBSCRIBED
 * - "online": both browser and realtime are healthy
 */
export const useOnlineStatus = () => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [realtimeOk, setRealtimeOk] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Browser online/offline events
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Lightweight heartbeat realtime channel to gauge backend connectivity
  useEffect(() => {
    const channel = supabase.channel(
      `heartbeat-${Math.random().toString(36).slice(2)}`
    );
    channelRef.current = channel;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setRealtimeOk(true);
      else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setRealtimeOk(false);
      }
    });
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  // When the browser comes back online, channel auto-reconnects;
  // realtimeOk will flip via the subscribe callback.

  let status: ConnectionStatus;
  if (!browserOnline) status = "offline";
  else if (!realtimeOk) status = "reconnecting";
  else status = "online";

  return { status, browserOnline, realtimeOk };
};
