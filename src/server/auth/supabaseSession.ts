import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAuthEnv } from '../env';

/**
 * Who is signed in, according to Supabase Auth. Sessions, passwords and
 * verification emails all live with Supabase — this module only reads the
 * cookie-held session and answers "which user, which email".
 *
 * The Square customer link rides along in `app_metadata.square_customer_id`
 * (set via the service role in account/identity.ts), which the user cannot
 * edit themselves — unlike user_metadata.
 */

export async function getSupabaseAuthServer(): Promise<SupabaseClient> {
  const env = getSupabaseAuthEnv();
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        // Route handlers may refresh the session; Server Components cannot
        // write cookies, and there the stale-but-valid token is still fine.
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* read-only cookie store */
        }
      },
    },
  });
}

export interface AuthUser {
  /** Supabase Auth user id. */
  id: string;
  /** Lowercased sign-in email. */
  email: string;
  /** Linked Square customer, once account/identity.ts has done its work. */
  squareCustomerId: string | null;
}

/** Null unless the request carries a valid, server-verified session. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await getSupabaseAuthServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const linked = data.user.app_metadata?.square_customer_id;
  return {
    id: data.user.id,
    email: data.user.email.toLowerCase(),
    squareCustomerId: typeof linked === 'string' && linked ? linked : null,
  };
}
