import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clientConfig, isSupabaseConfigured } from './clientConfig';

let instance: SupabaseClient | null = null;

/**
 * Returns a lazily-instantiated Supabase client, or `null` when the project
 * env vars are missing so callers can degrade gracefully instead of throwing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (instance) {
    return instance;
  }

  if (!isSupabaseConfigured) {
    console.warn(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.',
    );
    return null;
  }

  instance = createClient(clientConfig.supabaseUrl, clientConfig.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return instance;
}

export const supabase: SupabaseClient | null = getSupabaseClient();
