import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSiteUrl, isAccountAuthConfigured } from '@/server/env';
import { getSupabaseAuthServer } from '@/server/auth/supabaseSession';

/**
 * Where Supabase Auth redirects land: Google sign-in, sign-up confirmation
 * links and password-reset links. `?code=` (the PKCE flow) or
 * `?token_hash=&type=` (templates using token_hash links) is traded for a
 * session cookie, then the visitor continues to `next` — always a same-site
 * path, so the redirect cannot be pointed off-site.
 */

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) return raw;
  return '/es/account';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const to = (path: string) => NextResponse.redirect(new URL(path, getSiteUrl()));

  if (!isAccountAuthConfigured()) return to(next);

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  try {
    const supabase = await getSupabaseAuthServer();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (error) throw error;
    }
    return to(next);
  } catch (err) {
    console.error('auth callback failed', err);
    const joiner = next.includes('?') ? '&' : '?';
    return to(`${next}${joiner}auth_error=1`);
  }
}
