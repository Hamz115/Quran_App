import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, clearSupabaseStorage, resetSupabaseAndReload } from '../lib/supabase';
import { triggerSync, isLocalApiAvailable } from '../lib/local-api';
import { clearAllCache } from '../lib/cache';
import type { User } from '../types';
import type { Profile } from '../lib/database.types';

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
    role?: 'teacher' | 'student';  // Legacy, optional
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  emergencyReset: () => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
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

// Trigger local-first sync (non-blocking)
async function triggerLocalSync(): Promise<void> {
  try {
    const available = await isLocalApiAvailable();
    if (available) {
      console.log('AuthContext: Triggering local sync');
      await triggerSync();
      console.log('AuthContext: Sync triggered successfully');
    } else {
      console.log('AuthContext: Local API not available, skipping sync');
    }
  } catch (err) {
    console.warn('AuthContext: Sync failed (non-blocking):', err);
    // Don't throw - sync failure shouldn't block login
  }
}

// Fetch profile from profiles table and map to User type
async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single() as { data: Profile | null; error: any };

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
    role: (data.role as 'teacher' | 'student' | null) || null,
    is_verified: true,  // Legacy, always true now
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
              // Trigger sync on app start (non-blocking)
              if (profile?.role) {
                triggerLocalSync();
              }
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
        console.log('AuthContext: Auth state changed:', event, { hasSession: !!newSession, hasUser: !!newSession?.user });

        if (!isMounted) {
          console.log('AuthContext: Unmounted, ignoring auth state change');
          return;
        }

        setSession(newSession);

        if (newSession?.user) {
          // Handle email confirmation - user is now verified
          if (event === 'USER_UPDATED' && newSession.user.email_confirmed_at) {
            console.log('AuthContext: Email confirmed! User is now verified.');
          }

          // Fetch profile with timeout - don't block on failure
          try {
            const profile = await withTimeout(
              fetchUserProfile(newSession.user.id),
              PROFILE_TIMEOUT_MS,
              'fetchProfile-onChange'
            );
            if (isMounted) {
              setUser(profile);
              console.log('AuthContext: Profile loaded for event:', event);
            }
          } catch (err) {
            console.error('AuthContext: Profile fetch in onChange failed:', err);
            // IMPORTANT: Keep existing user if we have one - don't lose auth state
            // Only log, don't set user to null or undefined
            setUser(prev => {
              if (prev) {
                console.log('AuthContext: Keeping existing user state despite profile fetch failure');
                return prev;
              }
              // If no previous user, create minimal user from session
              console.log('AuthContext: Creating minimal user from session');
              const sessionUser = newSession.user;
              return {
                id: sessionUser.id,
                student_id: '',
                username: sessionUser.email?.split('@')[0] || '',
                email: sessionUser.email || '',
                first_name: sessionUser.user_metadata?.name?.split(' ')[0] || '',
                last_name: sessionUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                role: sessionUser.user_metadata?.role || 'student',
                is_verified: sessionUser.email_confirmed_at ? true : false,
                created_at: sessionUser.created_at || new Date().toISOString(),
              };
            });
          }
        } else if (event === 'SIGNED_OUT') {
          // Only clear user on explicit sign out
          console.log('AuthContext: Clearing user on SIGNED_OUT');
          setUser(null);
        } else if (!newSession) {
          // Session is null but not a sign out event - might be temporary
          // Wait a bit before clearing to avoid race conditions
          console.log('AuthContext: Session null but not SIGNED_OUT, checking in 1 second...');
          setTimeout(async () => {
            if (!isMounted) return;
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (!checkSession && isMounted) {
              console.log('AuthContext: Confirmed no session, clearing user');
              setUser(null);
            } else {
              console.log('AuthContext: Session recovered, keeping user');
            }
          }, 1000);
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

      // Trigger local sync in background (non-blocking)
      // Get session to fetch user role
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.user) {
        const profile = await fetchUserProfile(newSession.user.id);
        if (profile?.role) {
          triggerLocalSync(); // Don't await - background operation
        }
      }
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
              // role no longer sent — all users are equal
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

      // Trigger local sync in background (non-blocking)
      triggerLocalSync(); // Don't await - background operation
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

    // Clear cached data from previous user
    clearAllCache();

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

  const resetPassword = async (email: string) => {
    console.log('AuthContext: Requesting password reset for', email);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
        AUTH_TIMEOUT_MS,
        'resetPasswordForEmail'
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Password reset email sent');
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
        throw new Error('Request timed out. Please try again.');
      }
      throw err;
    }
  };

  const updatePassword = async (newPassword: string) => {
    console.log('AuthContext: Updating password');
    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword }),
        AUTH_TIMEOUT_MS,
        'updatePassword'
      );

      if (error) {
        throw new Error(error.message);
      }
      console.log('AuthContext: Password updated successfully');
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
        throw new Error('Request timed out. Please try again.');
      }
      throw err;
    }
  };

  const updateProfile = async (firstName: string, lastName: string) => {
    if (!session?.user) {
      throw new Error('Not authenticated');
    }

    console.log('AuthContext: Updating profile');
    try {
      const fullName = `${firstName} ${lastName}`.trim();

      const { error } = await supabase
        .from('profiles')
        .update({ name: fullName } as never)
        .eq('id', session.user.id);

      if (error) {
        throw new Error(error.message);
      }

      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        first_name: firstName,
        last_name: lastName,
      } : null);

      console.log('AuthContext: Profile updated successfully');
    } catch (err) {
      throw err;
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
        resetPassword,
        updatePassword,
        updateProfile,
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
