import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedClient } from '@common-lib/integrations/supabase/supabaseClient';
import { isSupabaseConfigured } from './clientConfig';

/**
 * Browser Supabase client, reusing the common-lib singleton (which reads
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Nullable so
 * callers can degrade gracefully when env vars are missing.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured ? sharedClient : null;
