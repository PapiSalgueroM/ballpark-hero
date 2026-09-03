import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheDisplayName,
  getGuestHandle,
  setDisplayNameStorageIdentity,
  setLocalCompletionStorageIdentity,
} from '@/lib/completions';
import {
  getStreakState,
  restoreStreakStateFromProfile,
  setStreakStorageIdentity,
} from '@/lib/streaks';
import {
  ensureProgressHydration,
  markProgressProfileVerified,
  resetProgressHydration,
} from '@/lib/progressHydration';

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

function isBlankProfileStreak(value: unknown): boolean {
  return value === null || (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value).length === 0
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authUserIdRef = useRef<string | null | undefined>(undefined);
  const authGenerationRef = useRef(0);
  const profileRequestRef = useRef(0);
  const latestProfileSnapshotRef = useRef<{
    generation: number;
    request: number;
    profile: Profile;
  } | null>(null);

  const setAuthIdentity = (userId: string | null) => {
    if (authUserIdRef.current === userId) return;
    authUserIdRef.current = userId;
    authGenerationRef.current += 1;
    profileRequestRef.current += 1;
    latestProfileSnapshotRef.current = null;
    setProfile(null);
    setDisplayNameStorageIdentity(userId);
    try { window.dispatchEvent(new Event('dukb-player-name-changed')); } catch { /* SSR/harness */ }
    setStreakStorageIdentity(userId);
    setLocalCompletionStorageIdentity(userId);
    resetProgressHydration(userId);
  };

  const fetchProfile = async (userId: string, hydrateProgress = false): Promise<boolean> => {
    const generation = authGenerationRef.current;
    const request = profileRequestRef.current + 1;
    profileRequestRef.current = request;
    const isCurrentIdentity = () => (
      generation === authGenerationRef.current
      && authUserIdRef.current === userId
    );
    const isLatestRequest = () => (
      isCurrentIdentity() && request === profileRequestRef.current
    );
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!isCurrentIdentity()) return false;
    /* A newer same-account refresh owns profile UI and display-name cache.
       Initial hydration still has to finish so a play already waiting on it
       can safely extend the remote streak instead of losing its backup. */
    if (!hydrateProgress && !isLatestRequest()) return false;

    if (error || !data) return false;

    let nextProfile = data as unknown as Profile;
    const rememberProfileSnapshot = (next: Profile) => {
      const remembered = latestProfileSnapshotRef.current;
      if (!remembered || remembered.generation !== generation || request >= remembered.request) {
        latestProfileSnapshotRef.current = { generation, request, profile: next };
      }
    };
    rememberProfileSnapshot(nextProfile);
    const updates: Partial<Profile> = {};
    let hydrationSucceeded = true;

    if (!nextProfile.display_name && !nextProfile.username && isLatestRequest()) {
      const suggestedName = getGuestHandle();
      const { data: claimed } = await (supabase.from as any)('profiles')
        .update({ display_name: suggestedName, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('display_name', null)
        .is('username', null)
        .select('*')
        .maybeSingle();
      if (!isCurrentIdentity()) return false;

      if (!isLatestRequest()) {
        /* A profile edit or fresher read now owns the visible name. The
           conditional database write could not replace a nonblank edit. */
      } else if (claimed) {
        nextProfile = claimed as Profile;
        rememberProfileSnapshot(nextProfile);
      } else {
        /* A real profile edit may have won the conditional update. Re-read it
           instead of trusting the blank row captured before that edit. */
        const { data: current } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!isCurrentIdentity()) return false;
        if (current) {
          nextProfile = current as unknown as Profile;
          rememberProfileSnapshot(nextProfile);
        } else if (isLatestRequest()) {
          nextProfile = { ...nextProfile, display_name: suggestedName };
        }
      }
    }

    const newerSnapshot = latestProfileSnapshotRef.current;
    if (hydrateProgress && !isLatestRequest()) {
      if (
        newerSnapshot?.generation !== generation
        || newerSnapshot.request <= request
      ) return false;
      nextProfile = newerSnapshot.profile;
    }

    if (hydrateProgress && !restoreStreakStateFromProfile(nextProfile.streak_state)) {
      if (isBlankProfileStreak(nextProfile.streak_state)) {
        updates.streak_state = getStreakState();
      } else {
        hydrationSucceeded = false;
      }
    }

    if (Object.keys(updates).length > 0 && isLatestRequest()) {
      const { error: syncError } = await supabase
        .from('profiles')
        .upsert(
          { user_id: userId, ...updates } as any,
          { onConflict: 'user_id' },
        );
      if (!syncError) nextProfile = { ...nextProfile, ...updates };
    }

    if (!isCurrentIdentity()) return false;

    if (isLatestRequest()) {
      setProfile(nextProfile);
      /* Round 301, audit finding 8: cache the display name where context
         free recorders (Club Manager's engine, the idle games) can reach
         it, so a signed in player's plays stop filing under their guest
         handle. Cleared on sign out below. */
      cacheDisplayName(nextProfile.display_name || nextProfile.username || null);
      if (!hydrateProgress) markProgressProfileVerified(userId);
    }
    return hydrationSucceeded;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Password-recovery links can land on any page (if the redirect URL
        // allowlist ever falls out of sync, Supabase falls back to the site
        // root). The recovery session is already captured at this point, so
        // route the player to the set-a-new-password screen no matter where
        // the link dropped them.
        if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password');
          return;
        }
        setAuthIdentity(session?.user?.id ?? null);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const hydrateProgress = event === 'INITIAL_SESSION' || event === 'SIGNED_IN';
          if (hydrateProgress) {
            void ensureProgressHydration(session.user.id, async () => {
              // Supabase auth callbacks must return before another client call.
              await new Promise<void>((resolve) => setTimeout(resolve, 0));
              return fetchProfile(session.user.id, true);
            });
          } else {
            setTimeout(() => { void fetchProfile(session.user.id, false); }, 0);
          }
        } else {
          cacheDisplayName(null);
          try { window.dispatchEvent(new Event('dukb-player-name-changed')); } catch { /* SSR/harness */ }
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthIdentity(session?.user?.id ?? null);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void ensureProgressHydration(session.user.id, () => fetchProfile(session.user.id, true));
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
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
    if (!error && data?.session?.user) {
      setAuthIdentity(data.session.user.id);
      await ensureProgressHydration(data.session.user.id, () => fetchProfile(data.session.user.id, true));
    }
    return { error, session: data?.session ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.session?.user) {
      setAuthIdentity(data.session.user.id);
      await ensureProgressHydration(data.session.user.id, () => fetchProfile(data.session.user.id, true));
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthIdentity(null);
    setProfile(null);
    cacheDisplayName(null);
    try { window.dispatchEvent(new Event('dukb-player-name-changed')); } catch { /* SSR/harness */ }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    profileRequestRef.current += 1;

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
