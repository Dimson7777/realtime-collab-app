import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/AvatarBubble";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useRoomRoles } from "@/hooks/useRoomRoles";
import { Lock } from "lucide-react";
import { ChatSkeleton } from "@/components/skeletons/Skeletons";
import { useSound } from "@/hooks/useSound";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface MemberInfo {
  display_name: string;
  avatar_color: string;
}

interface ChatPanelProps {
  roomId: string;
  members: Map<string, MemberInfo>;
}

export const ChatPanel = ({ roomId, members }: ChatPanelProps) => {
  const { user, profile } = useAuth();
  const { log } = useActivityLogger(roomId);
  const { canEdit } = useRoomRoles(roomId);
  const { play } = useSound();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted) {
        setMessages((data as ChatMessage[]) || []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`chat-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as ChatMessage;
            if (prev.find((x) => x.id === m.id)) return prev;
            // Soft chime when someone else sends a message
            if (m.user_id !== user?.id) play("soft-click");
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: user.id,
      content: text,
    });
    setSending(false);
    if (error) setInput(text);
    else {
      play("send");
      void log("sent_message", text.length > 60 ? `${text.slice(0, 57)}…` : text);
    }
  };

  const getMember = (uid: string): MemberInfo => {
    if (uid === user?.id && profile) return { display_name: profile.display_name, avatar_color: profile.avatar_color };
    return members.get(uid) || { display_name: "Member", avatar_color: "#f97316" };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4 bg-card/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-sm">
            <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-display font-semibold">Chat</h3>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 py-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aurora/20 ring-1 ring-aurora/30">
              <MessageSquare className="h-5 w-5 text-aurora" />
            </div>
            <p className="mt-5 text-sm font-medium">No messages yet</p>
            <p className="mt-1.5 text-xs text-muted-foreground">Say hello 👋</p>
          </div>
        ) : (
          <div className="px-4 py-5 space-y-5">
            {messages.map((m, idx) => {
              const member = getMember(m.user_id);
              const isMe = m.user_id === user?.id;
              const prev = messages[idx - 1];
              const showHeader =
                !prev ||
                prev.user_id !== m.user_id ||
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
              return (
                <div key={m.id} className="flex gap-3 animate-fade-in">
                  <div className="w-7 flex-shrink-0">
                    {showHeader && <AvatarBubble name={member.display_name} color={member.avatar_color} size="sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {showHeader && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: member.avatar_color }}>
                          {isMe ? "You" : member.display_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    <p className="mt-1 text-sm text-foreground/90 break-words leading-relaxed">{m.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-border/60 p-3 bg-card/40">
        {canEdit ? (
          <div className="relative flex items-center rounded-xl border border-input bg-background/80 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the room…"
              className="flex-1 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              variant="primary"
              disabled={!input.trim() || sending}
              className="m-1 h-8 w-8 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            View-only — ask the room owner for editor access
          </div>
        )}
      </form>
    </div>
  );
};
