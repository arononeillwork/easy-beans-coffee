import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchAndNormalizeCatalog } from '@/server/square/catalog';
import { toPriceBook } from '@/features/menu/priceBook';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getInstagramPosts } from '@/server/social/instagram';
import { getSocialFeed } from '@/server/social/feed';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { derivePublicStatus, shouldSyncFromSquare } from '@/server/orders/statusMapping';

/**
 * The site's facts come from other systems: prices from Square, rating and
 * hours from Google, posts from Instagram, order progress from Square again.
 * Each test below runs one of those paths end to end with the network faked at
 * `fetch`, and pins the two behaviours that matter: a change at the source
 * shows up on the site, and a dead source degrades instead of breaking a page.
 *
 * The browser-level twin of this file is tests/e2e/feeds.spec.ts.
 */

type Handler = (url: string) => { status?: number; body: unknown } | undefined;

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let calls: string[] = [];

function fakeNetwork(handler: Handler) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const hit = handler(url);
    if (!hit) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(hit.body), {
      status: hit.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env = { ...savedEnv };
  delete process.env.E2E_FEEDS_BASE;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...savedEnv };
});

// ── Square → menu prices ────────────────────────────────────────────────────

/** The fixture is SDK-shaped (camelCase); the live REST API speaks snake_case. */
function toSnake(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
      key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
      toSnake(inner),
    ]),
  );
}

function catalogFixture(): Record<string, unknown>[] {
  const file = path.resolve(process.cwd(), 'tests/unit/fixtures/square-catalog.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

function withPrice(objects: Record<string, unknown>[], itemName: string, cents: number) {
  for (const object of objects as Array<{ type?: string; itemData?: { name?: string; variations?: Array<{ itemVariationData: { priceMoney?: { amount: number } } }> } }>) {
    if (object.type === 'ITEM' && object.itemData?.name === itemName) {
      object.itemData.variations![0].itemVariationData.priceMoney!.amount = cents;
    }
  }
  return objects;
}

function useSquare(objects: Record<string, unknown>[]) {
  process.env.SQUARE_ENVIRONMENT = 'production';
  process.env.SQUARE_ACCESS_TOKEN = 'unit-token';
  process.env.SQUARE_LOCATION_ID = 'LKGQR7QKGC2S0';
  fakeNetwork((url) =>
    url.startsWith('https://connect.squareup.com/v2/catalog/list')
      ? { body: { objects: toSnake(objects) } }
      : undefined,
  );
}

function priceOf(book: ReturnType<typeof toPriceBook>, name: string): number | undefined {
  return book.items.find((item) => item.name === name)?.variations[0]?.cents;
}

test('Square: menu prices are read from the live catalog', async () => {
  useSquare(catalogFixture());
  const book = toPriceBook(await fetchAndNormalizeCatalog(), '2026-10-17');

  assert.ok(calls.some((u) => u.startsWith('https://connect.squareup.com/v2/catalog/list')));
  assert.equal(priceOf(book, 'Flat White'), 380);
  assert.equal(priceOf(book, 'Espresso'), 200);
  assert.equal(book.stale, false);
});

test('Square: a price changed in Square is the price the site shows', async () => {
  useSquare(withPrice(catalogFixture(), 'Flat White', 395));
  const book = toPriceBook(await fetchAndNormalizeCatalog(), '2026-10-17');
  assert.equal(priceOf(book, 'Flat White'), 395);
});

test('Square: test entries in the POS never reach the site', async () => {
  useSquare(catalogFixture());
  const book = toPriceBook(await fetchAndNormalizeCatalog(), '2026-10-17');
  assert.equal(book.items.some((item) => /^test\b/i.test(item.name)), false);
});

// ── Google Maps → rating, review count, opening hours ───────────────────────

const PERIODS = [1, 2, 3, 4, 5]
  .map((day) => ({ open: { day, hour: 8, minute: 0 }, close: { day, hour: 15, minute: 0 } }))
  .concat([{ open: { day: 6, hour: 9, minute: 0 }, close: { day: 6, hour: 15, minute: 0 } }]);

function useGoogle(body: Record<string, unknown>, status = 200) {
  process.env.GOOGLE_PLACES_API_KEY = 'unit-key';
  process.env.GOOGLE_PLACE_ID = 'unit-place';
  fakeNetwork((url) =>
    url.startsWith('https://places.googleapis.com/v1/places/unit-place') ? { status, body } : undefined,
  );
}

test('Google: rating, review count and weekly hours come from the listing', async () => {
  useGoogle({ rating: 4.7, userRatingCount: 24, regularOpeningHours: { periods: PERIODS } });
  const place = await getPlaceDetails('es');

  assert.equal(place?.rating, 4.7);
  assert.equal(place?.total, 24);
  const monday = place?.hours?.find((d) => d.day === 1);
  assert.deepEqual(monday?.ranges, [{ open: 480, close: 900 }]);
  assert.deepEqual(place?.hours?.find((d) => d.day === 0)?.ranges, []);
});

test('Google: no key configured means no request and a null result, never an error', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY;
  fakeNetwork(() => undefined);
  assert.equal(await getPlaceDetails('es'), null);
  assert.equal(calls.length, 0);
});

test('Google: an API error degrades to null rather than breaking the page', async () => {
  useGoogle({ error: { code: 403 } }, 403);
  assert.equal(await getPlaceDetails('en'), null);
});

test('Ordering hours: holiday hours on Google (currentOpeningHours) win over the regular week', async () => {
  const holidayWeek = PERIODS.filter((p) => p.open.day !== 3); // Wednesday closed
  useGoogle({
    regularOpeningHours: { periods: PERIODS },
    currentOpeningHours: { periods: holidayWeek },
  });
  const { hours, source } = await getOrderingHours();
  assert.equal(source, 'google');
  assert.deepEqual(hours.find((d) => d.day === 3)?.ranges, []);
  assert.deepEqual(hours.find((d) => d.day === 2)?.ranges, [{ open: 480, close: 900 }]);
});

test('Ordering hours: Google down falls back to the known week, so ordering keeps working', async () => {
  useGoogle({}, 500);
  const { hours, source } = await getOrderingHours();
  assert.equal(source, 'fallback');
  assert.deepEqual(hours, FALLBACK_HOURS);
});

// ── Instagram → post grid ───────────────────────────────────────────────────

test('Instagram: latest posts become tiles linking to each post', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'unit-token';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork((url) =>
    url.startsWith('https://graph.instagram.com/')
      ? {
          body: {
            data: [
              { id: '1', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/a.jpg', permalink: 'https://www.instagram.com/p/AAA/', caption: 'Ube latte\n#ube' },
              { id: '2', media_type: 'VIDEO', media_url: 'https://x/video.mp4', thumbnail_url: 'https://scontent.cdninstagram.com/b.jpg', permalink: 'https://www.instagram.com/reel/BBB/' },
              { id: '3', media_type: 'IMAGE', permalink: 'https://www.instagram.com/p/CCC/' }, // no image: dropped
            ],
          },
        }
      : undefined,
  );
  const posts = await getInstagramPosts(8);

  assert.deepEqual(posts.map((p) => p.permalink), ['https://www.instagram.com/p/AAA/', 'https://www.instagram.com/reel/BBB/']);
  assert.equal(posts[0].caption, 'Ube latte');
  assert.equal(posts[1].imageUrl, 'https://scontent.cdninstagram.com/b.jpg', 'videos show their still');
  assert.ok(posts.every((p) => p.remote));
});

test('Instagram: an expired token yields no posts (the grid shows our own photos)', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'expired';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork(() => ({ status: 400, body: { error: { code: 190 } } }));
  assert.deepEqual(await getInstagramPosts(8), []);
});

test('Social grid: with Instagram down, our own photos all link to Instagram — never TikTok', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'expired';
  delete process.env.TIKTOK_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork(() => ({ status: 400, body: { error: { code: 190 } } }));
  const feed = await getSocialFeed(['a', 'b', 'c', 'd']);
  assert.equal(feed.live, false);
  assert.equal(feed.posts.length, 4);
  assert.ok(feed.posts.every((p) => p.permalink.includes('instagram.com')), 'every tile opens Instagram');
});

// ── Square → live order status ──────────────────────────────────────────────

test('Order status: each step staff take on the till reaches the customer', () => {
  assert.equal(derivePublicStatus('PENDING', 'NEW'), 'awaiting_payment');
  assert.equal(derivePublicStatus('PAID', 'PROPOSED'), 'confirmed');
  assert.equal(derivePublicStatus('PAID', 'RESERVED'), 'preparing');
  assert.equal(derivePublicStatus('PAID', 'PREPARED'), 'ready');
  assert.equal(derivePublicStatus('PAID', 'COMPLETED'), 'collected');
  assert.equal(derivePublicStatus('CANCELED', 'PROPOSED'), 'cancelled');
});

test('Order status: the page keeps checking Square until the order is collected', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  const placed = '2026-10-17T11:50:00Z';
  assert.equal(shouldSyncFromSquare('PENDING', 'NEW', placed, now), true);
  assert.equal(shouldSyncFromSquare('PAID', 'PROPOSED', placed, now), true);
  assert.equal(shouldSyncFromSquare('PAID', 'PREPARED', placed, now), true);
  assert.equal(shouldSyncFromSquare('PAID', 'COMPLETED', placed, now), false);
  assert.equal(shouldSyncFromSquare('CANCELED', 'CANCELED', placed, now), false);
  // Yesterday's abandoned order is not polled forever.
  assert.equal(shouldSyncFromSquare('PAID', 'PROPOSED', '2026-10-16T08:00:00Z', now), false);
});

// ── Instagram token: self-renewed copy wins over the Vercel seed ────────────

test('Instagram: the self-renewed token in Supabase is used before the Vercel one', async () => {
  const { getInstagramToken } = await import('@/server/social/instagramToken');
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://unit.supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-service';
  process.env.INSTAGRAM_ACCESS_TOKEN = 'seed-token';
  fakeNetwork((url) =>
    url.startsWith('https://unit.supabase.test/rest/v1/feed_tokens')
      ? { body: [{ token: 'renewed-token', expires_at: '2026-12-16T00:00:00Z', refreshed_at: '2026-10-17T00:00:00Z' }] }
      : undefined,
  );
  assert.equal(await getInstagramToken(false), 'renewed-token');
});

test('Instagram: with nothing stored yet, the Vercel token is used', async () => {
  const { getInstagramToken } = await import('@/server/social/instagramToken');
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://unit.supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-service';
  process.env.INSTAGRAM_ACCESS_TOKEN = 'seed-token';
  fakeNetwork((url) => (url.includes('/rest/v1/feed_tokens') ? { body: [] } : undefined));
  assert.equal(await getInstagramToken(false), 'seed-token');
});
