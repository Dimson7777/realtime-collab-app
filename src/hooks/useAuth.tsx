import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_color: string;
  plan: "free" | "pro";
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

/**
 * Wipe any non-Supabase app data we may have stored locally.
 * Supabase manages its own session keys (sb-* / supabase.auth.token);
 * those are cleared by supabase.auth.signOut().
 */
const clearAppLocalData = () => {
  try {
    // Theme + sound preferences are device-level, not user-level: keep them.
    const KEEP = new Set(["theme", "sync.sound"]);
    const removeFrom = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (KEEP.has(k)) continue;
        // Always purge anything that looks user/session scoped
        keys.push(k);
      }
      keys.forEach((k) => storage.removeItem(k));
    };
    removeFrom(window.sessionStorage);
    // Only clear our app keys from localStorage; leave Supabase auth keys
    // (sb-*) alone — supabase.auth.signOut() handles those itself.
    const localKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (KEEP.has(k)) continue;
      if (k.startsWith("sb-") || k.startsWith("supabase.")) continue;
      localKeys.push(k);
    }
    localKeys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // best-effort: never block auth on storage errors
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // Track the last user id we saw so we can detect user-switching.
  const lastUserIdRef = useRef<string | null>(null);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    const handleSession = (s: Session | null, isInitial = false) => {
      const newUid = s?.user?.id ?? null;
      const prevUid = lastUserIdRef.current;

      // Detect a user switch (A → B) within the same tab.
      // Safety fallback: hard-reload so no in-memory state leaks across users.
      if (!isInitial && prevUid && newUid && prevUid !== newUid) {
        clearAppLocalData();
        queryClient.clear();
        window.location.replace("/dashboard");
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);

      if (newUid) {
        // Always pull fresh profile data on login / refresh — never reuse cache.
        setProfile(null);
        setTimeout(() => loadProfile(newUid), 0);
      } else {
        // Logged out → wipe everything user-scoped from memory + storage.
        setProfile(null);
        queryClient.clear();
        clearAppLocalData();
      }

      lastUserIdRef.current = newUid;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      handleSession(s, false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s, true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut: async () => {
          // Order matters: clear React state + caches first, then revoke session.
          queryClient.clear();
          clearAppLocalData();
          setProfile(null);
          await supabase.auth.signOut();
          // Hard redirect so every component re-mounts with a clean slate.
          window.location.replace("/auth");
        },
        refreshProfile: async () => {
          if (user) await loadProfile(user.id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
