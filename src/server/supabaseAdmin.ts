import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerEnv } from './env';

let client: SupabaseClient | null = null;

/**
 * Service-role Supabase client for API routes. Bypasses RLS — the orders,
 * webhook_events and email_signups tables have deny-all policies, so this
 * is the only access path. Never expose to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const env = getSupabaseServerEnv();
    client = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
