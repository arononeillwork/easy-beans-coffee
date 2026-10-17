import { NextResponse } from 'next/server';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { instagramHealth } from '@/server/social/instagram';
import { readStoredToken } from '@/server/social/instagramToken';
import { isWebhookConfigured } from '@/server/square/webhookVerify';
import { getSupabaseAdmin } from '@/server/supabaseAdmin';
import { isEmailConfigured } from '@/server/env';
import { drawMonthFor } from '@/server/competition/drawMonth';

export const dynamic = 'force-dynamic';

/**
 * One page for the owner: is every automatic feed flowing on this deployment?
 * No secrets, no customer data — counts, states and timestamps only.
 * Open https://www.easybeanscoffee.com/api/status in a browser.
 */
export async function GET() {
  const [prices, hours, place, instagram, stored] = await Promise.all([
    getPriceBookOrEmpty(),
    getOrderingHours(),
    getPlaceDetails('es'),
    instagramHealth(),
    readStoredToken('instagram', false),
  ]);

  let webhookLastEventAt: string | null = null;
  try {
    const { data } = await getSupabaseAdmin()
      .from('webhook_events')
      .select('received_at')
      .order('received_at', { ascending: false })
      .limit(1);
    webhookLastEventAt = data?.[0]?.received_at ?? null;
  } catch {
    // reported as null
  }

  // Competition: entries in the open month and the latest draw's state.
  let competition: Record<string, unknown> = {};
  try {
    const db = getSupabaseAdmin();
    const open = drawMonthFor();
    const [{ count }, { data: last }] = await Promise.all([
      db.from('competition_entries').select('id', { count: 'exact', head: true }).eq('draw_month', open),
      db.from('competition_draws').select('draw_month,status,ig_posted_at').order('draw_month', { ascending: false }).limit(1),
    ]);
    competition = { openMonth: open, entries: count ?? 0, lastDraw: last?.[0] ?? null };
  } catch {
    competition = { error: true };
  }

  return NextResponse.json(
    {
      email: { configured: isEmailConfigured() },
      competition,
      squarePrices: { items: prices.items.length, stale: prices.stale, fetchedAt: prices.fetchedAt },
      googleHours: { source: hours.source },
      googleRating: { rating: place?.rating ?? null, reviews: place?.total ?? null },
      instagram: {
        ...instagram,
        autoRenewed: stored !== null,
        expiresAt: stored?.expiresAt ?? null,
      },
      squareWebhook: { configured: isWebhookConfigured(), lastEventAt: webhookLastEventAt },
      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
