import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientConfig, isSupabaseConfigured } from './clientConfig';

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client for customer accounts. Separate from the common-lib
 * singleton (supabaseClient.ts): that one keeps sessions in localStorage where
 * API routes cannot see them, while this one stores the session in cookies so
 * /api/account* can authenticate the caller. Null when env vars are missing,
 * like everything else Supabase here.
 */
export function getSupabaseAuth(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createBrowserClient(clientConfig.supabaseUrl, clientConfig.supabaseAnonKey);
  }
  return client;
}
