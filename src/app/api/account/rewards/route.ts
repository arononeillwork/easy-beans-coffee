import { NextResponse } from 'next/server';
import { isAccountAuthConfigured } from '@/server/env';
import { getAuthUser } from '@/server/auth/supabaseSession';
import { readAccountSummary, syncAccountToAgent } from '@/server/businessAgent/account';
import type { AccountRewards } from '@/features/account/types';

/**
 * The signed-in customer's rewards, read from the Business Agent (the café's
 * back office): their beans (Square Loyalty, which the agent reads), their
 * credit and how posts earn cashback, and their code if they're a rep. One
 * place for all of it, the same as the café sees. Read-only: beans and credit
 * are spent at the till.
 *
 * Fails closed: the agent off, failing or slow is a 404 and the card isn't
 * shown. Someone the agent doesn't know yet is added there first.
 */
export async function GET() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }
  // The agent takes our word that the email is theirs: only once Supabase has confirmed it.
  if (!user.emailVerified) {
    return NextResponse.json({ error: 'rewards_unavailable' }, { status: 404 });
  }

  let summary = await readAccountSummary(user.email);
  if (summary && summary.customer === null) {
    await syncAccountToAgent({ email: user.email, squareCustomerId: user.squareCustomerId });
    summary = await readAccountSummary(user.email);
  }
  if (!summary?.customer) {
    return NextResponse.json({ error: 'rewards_unavailable' }, { status: 404 });
  }

  const rewards: AccountRewards = {
    firstName: summary.customer.first_name,
    points: summary.points ?? null,
    credit: summary.credit ?? null,
    cashback: summary.cashback ?? null,
    rep: summary.rep ?? null,
  };
  return NextResponse.json(rewards, { headers: { 'cache-control': 'no-store' } });
}
