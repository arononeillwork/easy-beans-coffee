/**
 * Client-side configuration, sourced from Next public env vars.
 * No server secrets belong here — only values safe to ship to the browser.
 */
export const clientConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  todoTable: process.env.NEXT_PUBLIC_TODO_TABLE ?? 'ToDo',
  // The /admin board lives in the BusinessAgent project, not the site's own
  // database. Falls back to the site's project when these are unset.
  boardSupabaseUrl:
    process.env.NEXT_PUBLIC_BOARD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  boardSupabaseAnonKey:
    process.env.NEXT_PUBLIC_BOARD_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '',
} as const;

export const isSupabaseConfigured: boolean = Boolean(
  clientConfig.supabaseUrl && clientConfig.supabaseAnonKey,
);
