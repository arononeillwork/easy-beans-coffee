import { NextResponse } from 'next/server';
import { getInstagramToken, writeStoredToken } from '@/server/social/instagramToken';

export const dynamic = 'force-dynamic';

const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token';

/**
 * Weekly (vercel.json → crons): swap the Instagram token for a fresh 60-day one
 * and store it in Supabase, so the feed never quietly lapses. Instagram allows a
 * refresh once a token is a day old and still valid; weekly keeps it far from
 * expiry. Responds with the new expiry only — never the token.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set;
 * with it unset, only Vercel's own cron user agent is accepted. Either way the
 * worst a stray call can do is extend the token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  const fromVercelCron = (request.headers.get('user-agent') ?? '').startsWith('vercel-cron');
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = await getInstagramToken(false);
  if (!token) return NextResponse.json({ ok: false, reason: 'no_token' });

  const res = await fetch(`${REFRESH_URL}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: { code?: number; message?: string };
  };
  if (!res.ok || !body.access_token) {
    console.warn('[instagram-token] refresh rejected', res.status, body.error?.code, body.error?.message);
    return NextResponse.json({ ok: false, status: res.status, code: body.error?.code ?? null }, { status: 502 });
  }

  const expiresAt = body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null;
  const stored = await writeStoredToken('instagram', body.access_token, expiresAt);
  if (!stored) {
    console.error('[instagram-token] refreshed but could not store the new token');
    return NextResponse.json({ ok: false, reason: 'store_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expiresAt });
}
