import { NextResponse } from 'next/server';
import { DEFAULT_LANG, isLang } from '@/i18n/config';
import { getSiteUrl, isAccountAuthConfigured } from '@/server/env';
import { getAuthUser } from '@/server/auth/supabaseSession';
import { joinClub } from '@/server/businessAgent/accounts';

export const dynamic = 'force-dynamic';

/**
 * Square's checkout page for the signed-in customer to join the coffee club,
 * with their sign-in email filled in. `{ lang }` in the body picks the account
 * page they come back to once paid. `{ url }`, or `{ error }`: already a
 * member, not taking members, or the agent couldn't be asked.
 */
export async function POST(request: Request) {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { lang?: unknown } | null;
  const lang = typeof body?.lang === 'string' && isLang(body.lang) ? body.lang : DEFAULT_LANG;

  const result = await joinClub(user.email, `${getSiteUrl().replace(/\/+$/, '')}/${lang}/account?club=joined`);
  const status = 'url' in result ? 200 : result.error === 'unavailable' ? 503 : 409;
  return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
}
