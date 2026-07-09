/**
 * Client-side configuration, sourced from Vite env vars (`import.meta.env`).
 * No server secrets belong here — only values safe to ship to the browser.
 */
export const clientConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  todoTable: import.meta.env.VITE_TODO_TABLE ?? 'todList',
  environment: import.meta.env.MODE,
} as const;

export const isSupabaseConfigured: boolean = Boolean(
  clientConfig.supabaseUrl && clientConfig.supabaseAnonKey,
);
