import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { loadSupabase } from '@/integrations/supabase/loadClient';
import { AUTH_STORAGE_KEY, onSupabaseClientReady } from '@/integrations/supabase/clientReady';
import { hasVerifiedLocalStorageWrites, probeStorageWrites, subscribeStorageTrouble } from '@/lib/safeStorage';
import { cacheDisplayName } from '@/lib/completions';

/** Mirrors the live `profiles` table exactly (verified against the schema in
    Round 55). The old shape claimed current_streak, longest_streak,
    last_played_date, total_games_played, total_correct_answers and
    streak_freezes; none of those columns exist here. They live on
    `user_scores`, which is where the UI reads streaks from. */
interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  streak_state: unknown;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** session is non-null when the project has email confirmation off (signup = instantly signed in). */
  signUp: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function needsAccountClient(): boolean {
  const { pathname, search, hash } = window.location;
  if (pathname !== '/' && !hasVerifiedLocalStorageWrites()) return true;
  if (/^\/(?:profile|admin|reset-password)(?:\/|$)/.test(pathname)) return true;
  const params = [new URLSearchParams(search), new URLSearchParams(hash.slice(1))];
  if (params.some(part => part.has('access_token') || part.has('error_description') || part.has('code')
    || part.get('type') === 'recovery')) return true;
  try {
    if (window.localStorage.getItem(AUTH_STORAGE_KEY) !== null
      || window.localStorage.getItem(AUTH_STORAGE_KEY + '-code-verifier') !== null) return true;
  } catch {
    return true;
  }
  // Home has no game storage notice to verify that a guest can write.
  if (pathname === '/') probeStorageWrites();
  return !hasVerifiedLocalStorageWrites();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const supabase = await loadSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as unknown as Profile);
      /* Round 301, audit finding 8: cache the display name where context
         free recorders (Club Manager's engine, the idle games) can reach
         it, so a signed in player's plays stop filing under their guest
         handle. Cleared on sign out below. */
      cacheDisplayName((data as unknown as Profile).display_name || (data as unknown as Profile).username || null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let active = true;
    let requested = false;
    let attached = false;
    let unsubscribe: (() => void) | undefined;
    const attach = async (supabase: Awaited<ReturnType<typeof loadSupabase>>) => {
      if (!active || attached) return;
      attached = true;
      // Subscribe before reading the session so a recovery link cannot be missed.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        // A recovery link can land on any page if its redirect URL is not accepted.
        if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password');
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Leave the auth callback before querying a profile through the same client.
          setTimeout(() => { if (active) void fetchProfile(session.user.id); }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
      setLoading(false);
    };

    const finishFailedLoad = () => { if (active) setLoading(false); };
    const start = () => {
      if (requested || attached) return;
      requested = true;
      void loadSupabase().then(attach).catch(() => {
        requested = false;
        finishFailedLoad();
      });
    };
    // The account form and some data routes import the same client directly.
    const unwatchClient = onSupabaseClientReady(client => { void attach(client).catch(finishFailedLoad); });
    const storageChanged = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY && event.newValue !== null) start();
    };
    let unwatchStorage: (() => void) | undefined;
    if (needsAccountClient()) start();
    else if (!attached) {
      setLoading(false);
      window.addEventListener('storage', storageChanged);
      unwatchStorage = subscribeStorageTrouble(() => { if (!hasVerifiedLocalStorageWrites()) start(); });
    }

    return () => {
      active = false;
      unwatchClient();
      unwatchStorage?.();
      window.removeEventListener('storage', storageChanged);
      unsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const supabase = await loadSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    // With email confirmation off, Supabase returns a live session right here
    // and the player is signed in the moment the account exists. The modal
    // uses this to say "you're in" instead of "check your email".
    return { error, session: data?.session ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const supabase = await loadSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
    setProfile(null);
    cacheDisplayName(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const supabase = await loadSupabase();
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: user.id, ...updates } as any,
        { onConflict: 'user_id' }
      );

    if (!error) {
      await refreshProfile();
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
