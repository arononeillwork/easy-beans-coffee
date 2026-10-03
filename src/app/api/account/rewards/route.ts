import { NextResponse } from 'next/server';
import { isAccountAuthConfigured } from '@/server/env';
import { getAuthUser } from '@/server/auth/supabaseSession';
import { getLoyaltyBalance, getLoyaltyProgram } from '@/server/square/loyalty';

/**
 * The signed-in customer's rewards, read live from Square Loyalty: the
 * programme (what a bean is called, what the rewards cost) and their own
 * balance. Read-only — beans are earned and spent at the till.
 */
export async function GET() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  try {
    // The Square link is made by the profile read that renders the page; a
    // user not linked yet simply has no balance to show.
    const [program, account] = await Promise.all([
      getLoyaltyProgram(),
      user.squareCustomerId ? getLoyaltyBalance(user.squareCustomerId) : null,
    ]);
    return NextResponse.json({
      program,
      balance: account?.balance ?? null,
      lifetimePoints: account?.lifetimePoints ?? null,
    });
  } catch (err) {
    console.error('rewards read failed', err);
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}
