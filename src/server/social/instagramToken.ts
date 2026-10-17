import 'server-only';

/**
 * The Instagram access token in use: the self-renewed one in Supabase
 * (`feed_tokens`, kept fresh by /api/cron/instagram-token) when there is one,
 * otherwise INSTAGRAM_ACCESS_TOKEN from Vercel — the seed it all starts from.
 *
 * Read over plain REST with a cache window rather than through supabase-js,
 * so it never turns the statically generated homepage into an uncached one.
 */

const CACHE_SECONDS = 3_600;

export type StoredToken = { token: string; expiresAt: string | null; refreshedAt: string | null };

function supabaseRest(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export async function readStoredToken(name: string, cacheSeconds: number | false = CACHE_SECONDS): Promise<StoredToken | null> {
  const rest = supabaseRest();
  if (!rest) return null;
  try {
    const res = await fetch(`${rest.url}/rest/v1/feed_tokens?name=eq.${encodeURIComponent(name)}&select=token,expires_at,refreshed_at`, {
      headers: { apikey: rest.key, Authorization: `Bearer ${rest.key}` },
      ...(cacheSeconds === false ? { cache: 'no-store' as const } : { next: { revalidate: cacheSeconds } }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { token?: string; expires_at?: string | null; refreshed_at?: string | null }[];
    const row = rows[0];
    return row?.token ? { token: row.token, expiresAt: row.expires_at ?? null, refreshedAt: row.refreshed_at ?? null } : null;
  } catch {
    return null;
  }
}

export async function writeStoredToken(name: string, token: string, expiresAt: string | null): Promise<boolean> {
  const rest = supabaseRest();
  if (!rest) return false;
  const res = await fetch(`${rest.url}/rest/v1/feed_tokens?on_conflict=name`, {
    method: 'POST',
    headers: {
      apikey: rest.key,
      Authorization: `Bearer ${rest.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ name, token, expires_at: expiresAt, refreshed_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  return res.ok;
}

/** The token to call Instagram with, or null when none is configured. */
export async function getInstagramToken(cacheSeconds: number | false = CACHE_SECONDS): Promise<string | null> {
  const stored = await readStoredToken('instagram', cacheSeconds);
  return stored?.token ?? process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ?? null;
}
