import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    role: 'teacher' | 'student';
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Session timeout in milliseconds - if getSession takes longer, assume corrupted
// Note: 10 seconds to account for cloud latency (Supabase is in Asia Pacific)
const SESSION_TIMEOUT_MS = 10000;

// Helper to add timeout to a promise
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

// Clear corrupted Supabase localStorage entries
function clearSupabaseStorage() {
  console.log('AuthContext: Clearing corrupted Supabase storage...');
  const keys = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase'));
  keys.forEach(k => localStorage.removeItem(k));
  console.log('AuthContext: Cleared', keys.length, 'storage entries');
}

// Fetch profile from profiles table and map to User type
async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching profile:', error);
    return null;
  }

  // Map Supabase profile to User type
  const nameParts = data.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: data.id,
    student_id: data.student_id || '',
    username: data.email.split('@')[0],
    email: data.email,
    first_name: firstName,
    last_name: lastName,
    role: data.role as 'teacher' | 'student',
    is_verified: data.is_verified,
    created_at: data.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount and listen for changes
  useEffect(() => {
    let isMounted = true;

    // Get initial session with timeout protection
    async function initSession() {
      console.log('AuthContext: Starting getSession...');

      try {
        // Add timeout to detect stuck/corrupted sessions
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS
        );

        console.log('AuthContext: getSession completed', { hasSession: !!session, error });

        if (!isMounted) {
          console.log('AuthContext: Component unmounted, skipping state update');
          return;
        }

        if (error) {
          console.error('AuthContext: getSession error:', error);
          setIsLoading(false);
          return;
        }

        setSession(session);
        if (session?.user) {
          console.log('AuthContext: Fetching profile for user:', session.user.id);
          try {
            const profile = await withTimeout(
              fetchUserProfile(session.user.id),
              SESSION_TIMEOUT_MS
            );
            if (isMounted) {
              setUser(profile);
              console.log('AuthContext: Profile loaded:', profile?.email);
            }
          } catch (profileError) {
            console.error('AuthContext: Profile fetch error:', profileError);
          }
        }
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('AuthContext: getSession failed:', err);

        // If timeout, clear corrupted storage and let user re-login
        if (err instanceof Error && err.message === 'TIMEOUT') {
          console.warn('AuthContext: Session fetch timed out - clearing corrupted storage');
          clearSupabaseStorage();
        }

        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, { hasSession: !!session });

        if (!isMounted) return;

        setSession(session);

        if (session?.user) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (isMounted) {
              setUser(profile);
            }
          } catch (profileError) {
            console.error('AuthContext: Profile fetch in onAuthStateChange error:', profileError);
          }
        } else {
          setUser(null);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing session first to avoid client locks
      // This is a quick local operation - don't timeout
      console.log('AuthContext: Clearing existing session before login...');
      await supabase.auth.signOut({ scope: 'local' });
      clearSupabaseStorage();

      console.log('AuthContext: Attempting login for', email);
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SESSION_TIMEOUT_MS
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Login successful');
      // User state will be updated by onAuthStateChange listener
    } catch (err) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        console.error('AuthContext: Login timed out after', SESSION_TIMEOUT_MS, 'ms');
        // Clear potentially corrupted storage on timeout
        clearSupabaseStorage();
        throw new Error('Login timed out. Please try again.');
      }
      throw err;
    }
  };

  const signup = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    role: 'teacher' | 'student';
  }) => {
    try {
      // Clear any existing session first
      console.log('AuthContext: Clearing existing session before signup...');
      await supabase.auth.signOut({ scope: 'local' });
      clearSupabaseStorage();

      console.log('AuthContext: Attempting signup for', data.email);
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: `${data.first_name} ${data.last_name}`,
              role: data.role,
            },
          },
        }),
        SESSION_TIMEOUT_MS
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Signup successful');
      // User state will be updated by onAuthStateChange listener
    } catch (err) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        console.error('AuthContext: Signup timed out after', SESSION_TIMEOUT_MS, 'ms');
        clearSupabaseStorage();
        throw new Error('Signup timed out. Please try again.');
      }
      throw err;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      setUser(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isVerified: user?.is_verified ?? false,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
