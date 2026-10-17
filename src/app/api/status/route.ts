import { NextResponse } from 'next/server';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { instagramHealth } from '@/server/social/instagram';
import { readStoredToken } from '@/server/social/instagramToken';
import { isWebhookConfigured } from '@/server/square/webhookVerify';
import { getSupabaseAdmin } from '@/server/supabaseAdmin';

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

  return NextResponse.json(
    {
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
