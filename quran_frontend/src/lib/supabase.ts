import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

// Create a fresh Supabase client
function createSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
  });
}

// Mutable reference to allow client recreation
let supabaseInstance = createSupabaseClient();

// Export getter so we always use the current instance
export const supabase = supabaseInstance;

// Clear all Supabase-related storage
export function clearSupabaseStorage() {
  console.log('Supabase: Clearing all storage...');
  const keys = Object.keys(localStorage).filter(
    k => k.includes('sb-') || k.includes('supabase')
  );
  keys.forEach(k => localStorage.removeItem(k));
  console.log('Supabase: Cleared', keys.length, 'storage entries');
}

// Nuclear reset - clears storage and reloads page
// Use this when the client is completely stuck
export function resetSupabaseAndReload() {
  console.log('Supabase: NUCLEAR RESET - clearing storage and reloading...');
  clearSupabaseStorage();
  window.location.reload();
}

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
