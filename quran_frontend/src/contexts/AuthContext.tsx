import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, clearSupabaseStorage, resetSupabaseAndReload } from '../lib/supabase';
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
  emergencyReset: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Timeouts in milliseconds
const AUTH_TIMEOUT_MS = 10000;    // 10 seconds for auth operations
const PROFILE_TIMEOUT_MS = 5000; // 5 seconds for profile fetch
const STUCK_TIMEOUT_MS = 15000;  // 15 seconds = something is very wrong

// Helper to add timeout to a promise
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
    ),
  ]);
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

  // Emergency reset - use when everything is stuck
  const emergencyReset = useCallback(() => {
    console.warn('AuthContext: EMERGENCY RESET triggered');
    resetSupabaseAndReload();
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;
    let stuckTimer: ReturnType<typeof setTimeout>;

    // Safety net: if loading for too long, something is very wrong
    stuckTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.error('AuthContext: STUCK for', STUCK_TIMEOUT_MS, 'ms - triggering emergency reset');
        resetSupabaseAndReload();
      }
    }, STUCK_TIMEOUT_MS);

    async function initSession() {
      console.log('AuthContext: Initializing session...');

      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'getSession'
        );

        if (!isMounted) {
          console.log('AuthContext: Unmounted during getSession, aborting');
          return;
        }

        if (error) {
          console.error('AuthContext: getSession error:', error);
          setIsLoading(false);
          return;
        }

        console.log('AuthContext: Session retrieved', { hasSession: !!session });
        setSession(session);

        if (session?.user) {
          try {
            const profile = await withTimeout(
              fetchUserProfile(session.user.id),
              PROFILE_TIMEOUT_MS,
              'fetchProfile'
            );
            if (isMounted) {
              setUser(profile);
              console.log('AuthContext: Profile loaded:', profile?.email);
            }
          } catch (profileError) {
            console.error('AuthContext: Profile fetch failed:', profileError);
            // Continue without profile - user can retry
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('AuthContext: Init failed:', err);

        if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
          console.warn('AuthContext: Timeout during init - clearing storage');
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
      async (event, newSession) => {
        console.log('AuthContext: Auth state changed:', event);

        if (!isMounted) {
          console.log('AuthContext: Unmounted, ignoring auth state change');
          return;
        }

        setSession(newSession);

        if (newSession?.user) {
          // Fetch profile with timeout - don't block on failure
          try {
            const profile = await withTimeout(
              fetchUserProfile(newSession.user.id),
              PROFILE_TIMEOUT_MS,
              'fetchProfile-onChange'
            );
            if (isMounted) {
              setUser(profile);
            }
          } catch (err) {
            console.error('AuthContext: Profile fetch in onChange failed:', err);
            // Don't crash - just continue without updated profile
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
      clearTimeout(stuckTimer);
      subscription.unsubscribe();
    };
  }, [isLoading]);

  const login = async (email: string, password: string) => {
    // Clear storage first (synchronous, can't hang)
    console.log('AuthContext: Login - clearing storage first');
    clearSupabaseStorage();

    // Attempt signOut with short timeout (cleanup, ignore failures)
    try {
      await withTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        2000,
        'signOut-cleanup'
      );
    } catch {
      // Ignore - just cleanup
    }

    console.log('AuthContext: Attempting login for', email);
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'signInWithPassword'
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Login successful');
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
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
    // Clear storage first
    console.log('AuthContext: Signup - clearing storage first');
    clearSupabaseStorage();

    // Cleanup signOut
    try {
      await withTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        2000,
        'signOut-cleanup'
      );
    } catch {
      // Ignore
    }

    console.log('AuthContext: Attempting signup for', data.email);
    try {
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
        AUTH_TIMEOUT_MS,
        'signUp'
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Signup successful');
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
        clearSupabaseStorage();
        throw new Error('Signup timed out. Please try again.');
      }
      throw err;
    }
  };

  const logout = async () => {
    console.log('AuthContext: Logging out');

    // Clear state immediately (optimistic)
    setUser(null);
    setSession(null);

    // Then try to sign out with timeout
    try {
      await withTimeout(
        supabase.auth.signOut(),
        5000,
        'signOut'
      );
      console.log('AuthContext: Logout successful');
    } catch (err) {
      console.error('AuthContext: Logout failed:', err);
      // Force clear storage if signOut hangs
      clearSupabaseStorage();
    }
  };

  const refreshUser = async () => {
    if (!session?.user) return;

    try {
      const profile = await withTimeout(
        fetchUserProfile(session.user.id),
        PROFILE_TIMEOUT_MS,
        'refreshUser'
      );
      setUser(profile);
    } catch (err) {
      console.error('AuthContext: refreshUser failed:', err);
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
        emergencyReset,
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
