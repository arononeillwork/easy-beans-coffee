import { NextResponse } from 'next/server';
import { isAccountAuthConfigured } from '@/server/env';
import { getAuthUser } from '@/server/auth/supabaseSession';
import { listOrdersForUser } from '@/server/orders/orderRepo';
import { toAccountOrder } from '@/server/orders/accountOrders';

export const dynamic = 'force-dynamic';

/**
 * The signed-in customer's collection orders, newest first. Every order is
 * placed from an account (see /api/checkout), so this is their full history
 * on the site; each one links to its own live status page.
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
    const rows = await listOrdersForUser(user.id);
    return NextResponse.json(
      { orders: rows.map(toAccountOrder) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('account orders read failed', err);
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}
