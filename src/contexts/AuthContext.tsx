import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Password-recovery links can land on any page (if the redirect URL
        // allowlist ever falls out of sync, Supabase falls back to the site
        // root). The recovery session is already captured at this point, so
        // route the player to the set-a-new-password screen no matter where
        // the link dropped them.
        if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password');
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
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
    return { error, session: data?.session ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    cacheDisplayName(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

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
