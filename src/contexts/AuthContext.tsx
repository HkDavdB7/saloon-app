import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';

// DEV QA BYPASS — only active in non-production builds
const isBypass =
  import.meta.env.MODE !== 'production' &&
  (new URLSearchParams(window.location.search).has('bypass') ||
    localStorage.getItem('DEV_BYPASS') === '1');

if (isBypass && import.meta.env.MODE !== 'production') {
  localStorage.setItem('DEV_BYPASS', '1');
}

const BYPASS_USER = {
  id: 'e837efe3-6762-4b8a-8bc5-8efcdc140cb0',
  email: '7o.kassab@gmail.com',
} as User;

const BYPASS_PROFILE: Profile = {
  id: 'e837efe3-6762-4b8a-8bc5-8efcdc140cb0',
  full_name: 'Dev Admin',
  role: 'admin',
} as Profile;

const BYPASS_SESSION = { user: BYPASS_USER } as Session;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Auto-link a stylist row when the user logs in with a matching invite_email */
const autoLinkStylist = async (userId: string, email: string) => {
  try {
    const { data } = await supabase
      .from('barbers')
      .select('id')
      .eq('invite_email', email)
      .is('profile_id', null)
      .limit(1)
      .maybeSingle();

    if (data) {
      await supabase.from('barbers').update({ profile_id: userId }).eq('id', data.id);
    }
  } catch {
    // non-critical — silently ignore
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(isBypass ? BYPASS_SESSION : null);
  const [user, setUser] = useState<User | null>(isBypass ? BYPASS_USER : null);
  const [profile, setProfile] = useState<Profile | null>(isBypass ? BYPASS_PROFILE : null);
  const [loading, setLoading] = useState(isBypass ? false : true);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // No profile row — sign out to prevent infinite spinner
      setProfile(null);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      window.location.href = '/auth';
      return;
    }

    setProfile(data);

    // Auto-link stylist if applicable
    if (data.role === 'stylist' && userEmail) {
      autoLinkStylist(userId, userEmail);
    }
  };

  const refreshProfile = async () => {
    if (isBypass) return;
    if (user) await fetchProfile(user.id, user.email);
  };

  const signOut = async () => {
    if (isBypass) {
      localStorage.removeItem('DEV_BYPASS');
      window.location.href = '/';
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  // ── Step 1: Initialize from existing session synchronously, then subscribe ──
  useEffect(() => {
    if (isBypass) return;

    // Get current session without holding auth lock
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
      // If there IS a session, the profile useEffect below will handle loading
    });

    // onAuthStateChange: SYNCHRONOUS state update only — no async DB calls here.
    // Doing async work inside the listener causes Supabase lock deadlocks with
    // concurrent signInWithPassword / signOut calls.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          setProfile(null);
          setLoading(false);
        } else {
          // Keep loading=true until profile useEffect resolves.
          // Prevents AuthPage from seeing session+no-profile and routing to /setup.
          setLoading(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Step 2: Fetch profile whenever user changes ──
  useEffect(() => {
    if (isBypass) return;
    if (!user) return;

    setLoading(true);
    fetchProfile(user.id, user.email ?? undefined).finally(() => {
      setLoading(false);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
