import { NextResponse } from 'next/server';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getCafeReviews } from '@/server/businessAgent/reviewsFeed';
import { getAgentPosts } from '@/server/businessAgent/postsFeed';
import { getAgentMenu } from '@/server/businessAgent/menuFeed';
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
  const [prices, hours, reviews, posts, menu, instagram, stored] = await Promise.all([
    getPriceBookOrEmpty(),
    getOrderingHours(),
    getCafeReviews(),
    getAgentPosts(),
    getAgentMenu(),
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
      // Hours, closures and contacts: from the Business Agent ('agent'), or the built-in ones ('fallback').
      businessAgentDetails: { source: hours.source },
      // What's on the menu and its prices: null when the agent has never been read (the site lists its own).
      businessAgentMenu: menu ? { items: menu.sections.reduce((n, s) => n + s.items.length, 0), generatedAt: menu.generated_at } : null,
      // The Google rating, as the agent reads it from Google Maps.
      businessAgentReviews: reviews ? { rating: reviews.rating, reviews: reviews.total } : null,
      // The Instagram grid, as the agent reads it from Instagram.
      businessAgentPosts: posts ? { source: posts.source, posts: posts.posts.length, fetchedAt: posts.fetched_at } : null,
      // The site's own Instagram token: only the café TV's poster mode (SHOW_NEWEST_POST) still uses it.
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
