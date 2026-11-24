import { NextResponse } from 'next/server';
import { isAccountAuthConfigured } from '@/server/env';
import { getAuthUser } from '@/server/auth/supabaseSession';
import { clubFor } from '@/server/businessAgent/accounts';

export const dynamic = 'force-dynamic';

/**
 * The signed-in customer's coffee club, from the Business Agent: their pass
 * (this week's coffee, and their member code for the barcode they show at the
 * counter) or how to join. `club: null` when the café has none or the agent
 * couldn't be asked: the account page then shows no club card.
 */
export async function GET() {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  const club = await clubFor({ email: user.email, squareCustomerId: user.squareCustomerId });
  return NextResponse.json({ club }, { headers: { 'Cache-Control': 'no-store' } });
}
