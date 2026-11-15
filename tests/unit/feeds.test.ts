import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fetchAndNormalizeCatalog } from '@/server/square/catalog';
import { toPriceBook } from '@/features/menu/priceBook';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getInstagramPostImageUrl, getLatestInstagramPost } from '@/server/social/instagram';
import { getSocialFeed } from '@/server/social/feed';
import { getCafeReviews } from '@/server/businessAgent/reviewsFeed';
import { parseAgentReviews, cafeReviews } from '@/features/reviews/agentReviews';
import { parseAgentPosts } from '@/features/social/agentPosts';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { derivePublicStatus, shouldSyncFromSquare } from '@/server/orders/statusMapping';

/**
 * The site's facts come from other systems: what's on the menu, its prices,
 * the hours, the Google rating and the Instagram posts from the Business Agent
 * (the café's back office, which reads Google and Instagram itself), the ids an
 * order is placed with and its progress from Square.
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

// ── Business Agent → Google rating and reviews ───────────────────────────────

const REVIEWS_URL = 'https://agent.test/api/site/1/reviews';
const reviewsFeed = (more: Record<string, unknown> = {}) => ({
  version: 1,
  business: { id: 1, name: 'Easy Beans Coffee' },
  source: 'business_profile',
  rating: 4.7,
  count: 27,
  maps_url: 'https://maps.google.com/maps?cid=95',
  write_review_url: 'https://search.google.com/local/writereview?placeid=ChIJeasy',
  reviews: [
    { id: 'a', rating: 5, text: 'Best flat white', reviewer: 'Ana', created_at: '2026-11-10T10:00:00Z', language: 'en', reply: 'Thanks!', url: null, photos: [] },
    { id: 'b', rating: 2, text: 'Slow', reviewer: 'Tom', created_at: '2026-11-12T10:00:00Z', language: 'en', reply: null, url: null, photos: [] },
    { id: 'c', rating: 4, text: 'Lovely terrace', reviewer: 'Lu', created_at: '2026-11-11T10:00:00Z', language: 'es', reply: null, url: 'http://not-https.test', photos: [{ url: 'https://lh3.test/p' }] },
    { id: 'd', rating: 5, text: 'Ube latte!', reviewer: 'Sam', created_at: '2026-11-09T10:00:00Z', language: 'en', reply: null, url: null, photos: [] },
    { rating: 5, text: 'No id: left out' },
  ],
  checked_at: '2026-11-15T09:00:00Z',
  generated_at: '2026-11-15T09:05:00Z',
  ...more,
});

test('Agent reviews: the rating, count and links come from the Business Agent', async () => {
  process.env.BUSINESS_AGENT_REVIEWS_URL = REVIEWS_URL;
  fakeNetwork((url) => (url === REVIEWS_URL ? { body: reviewsFeed() } : undefined));
  const reviews = await getCafeReviews();

  assert.equal(reviews?.rating, 4.7);
  assert.equal(reviews?.total, 27);
  assert.equal(reviews?.reviewsUrl, 'https://maps.google.com/maps?cid=95');
  assert.equal(reviews?.writeReviewUrl, 'https://search.google.com/local/writereview?placeid=ChIJeasy');
  assert.ok(!calls.some((u) => u.includes('googleapis.com')), 'Google is never asked by the site');
});

test('Agent reviews: a change in the agent (a new review) is a change here', async () => {
  process.env.BUSINESS_AGENT_REVIEWS_URL = REVIEWS_URL;
  fakeNetwork((url) => (url === REVIEWS_URL ? { body: reviewsFeed({ rating: 4.8, count: 28 }) } : undefined));
  const reviews = await getCafeReviews();
  assert.equal(reviews?.rating, 4.8);
  assert.equal(reviews?.total, 28);
});

test('Agent reviews: the agent down keeps the last rating read', async () => {
  process.env.BUSINESS_AGENT_REVIEWS_URL = REVIEWS_URL;
  fakeNetwork(() => ({ status: 503, body: { error: 'down' } }));
  assert.equal((await getCafeReviews())?.rating, 4.8);
});

test('Agent reviews: switched off, nothing is asked and there is no rating to show', async () => {
  process.env.BUSINESS_AGENT_REVIEWS_URL = 'off';
  fakeNetwork(() => undefined);
  assert.equal(await getCafeReviews(), null);
  assert.equal(calls.length, 0);
});

test('Agent reviews: the best of the newest are picked, and only https links kept', () => {
  const feed = parseAgentReviews(reviewsFeed());
  assert.ok(feed);
  assert.equal(feed.reviews.length, 4, 'a review without an id is left out, not the feed');
  assert.equal(feed.reviews.find((r) => r.id === 'c')?.url, null);
  assert.deepEqual(cafeReviews(feed).reviews.map((r) => r.id), ['c', 'a', 'd'], 'four stars and up, newest first');
  assert.equal(parseAgentReviews({ ...reviewsFeed(), version: 2 }), null, 'another version is not read as this one');
  assert.equal(parseAgentReviews(reviewsFeed({ rating: 9 }))?.rating, null, 'a rating that is not one is not shown');
});

// Ordering follows the Business Agent's week and closures now (tests/unit/agentDetails.test.ts), not Google's.
test('Ordering hours: with no Business Agent the known week, so ordering keeps working', async () => {
  fakeNetwork(() => ({ status: 500, body: {} }));
  const { hours, source } = await getOrderingHours();
  assert.equal(source, 'fallback');
  assert.deepEqual(hours, FALLBACK_HOURS);
});

// ── Business Agent → post grid ──────────────────────────────────────────────

const POSTS_URL = 'https://agent.test/api/site/1/posts';
const postsFeed = (posts: unknown[]) => ({
  version: 1,
  business: { id: 1, name: 'Easy Beans Coffee' },
  source: 'instagram',
  account: { handle: 'easy.beans.coffee', url: 'https://www.instagram.com/easy.beans.coffee' },
  posts,
  fetched_at: '2026-11-15T10:00:00Z',
  generated_at: '2026-11-15T10:01:00Z',
});

test('Social grid: the posts the agent reads from Instagram become tiles linking to each post', async () => {
  process.env.BUSINESS_AGENT_POSTS_URL = POSTS_URL;
  fakeNetwork((url) =>
    url === POSTS_URL
      ? {
          body: postsFeed([
            { id: '1', permalink: 'https://www.instagram.com/p/AAA/', image_url: 'https://scontent.cdninstagram.com/a.jpg', caption: 'Ube latte\n#ube', posted_at: '2026-11-15T08:00:00Z', video: false },
            { id: '2', permalink: 'https://www.instagram.com/reel/BBB/', image_url: 'https://scontent.cdninstagram.com/b.jpg', caption: null, posted_at: '2026-11-14T08:00:00Z', video: true },
            { id: '3', permalink: 'https://www.instagram.com/p/CCC/', posted_at: '2026-11-13T08:00:00Z' }, // no picture: left out
          ]),
        }
      : undefined,
  );
  const feed = await getSocialFeed(['a', 'b', 'c', 'd']);

  assert.equal(feed.live, true);
  assert.deepEqual(feed.posts.map((p) => p.permalink), ['https://www.instagram.com/p/AAA/', 'https://www.instagram.com/reel/BBB/']);
  assert.equal(feed.posts[0].caption, 'Ube latte', 'one line, hashtags dropped');
  assert.equal(feed.posts[1].isVideo, true);
  assert.deepEqual(feed.account, { handle: 'easy.beans.coffee', url: 'https://www.instagram.com/easy.beans.coffee' });
  assert.ok(!calls.some((u) => u.includes('graph.instagram.com')), 'Instagram is never asked by the site');
});

test('Social grid: with no posts from the agent, our own photos all link to Instagram — never TikTok', async () => {
  process.env.BUSINESS_AGENT_POSTS_URL = 'off';
  fakeNetwork(() => undefined);
  const feed = await getSocialFeed(['a', 'b', 'c', 'd']);
  assert.equal(feed.live, false);
  assert.equal(feed.posts.length, 4);
  assert.ok(feed.posts.every((p) => p.permalink.includes('instagram.com')), 'every tile opens Instagram');
});

test('Social grid: a feed that is not one is not read', () => {
  assert.equal(parseAgentPosts({ version: 1, business: {}, posts: 'none' }), null);
  assert.equal(parseAgentPosts(postsFeed([{ id: '1', permalink: 'javascript:alert(1)', image_url: 'https://x.test/a.jpg', posted_at: '2026-11-15T08:00:00Z' }]))?.posts.length, 0);
});

// ── Instagram → the café TV (/display-menu) ────────────────────────────────

test('Café TV: shows the newest post that has a picture', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'unit-token';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork((url) =>
    url.startsWith('https://graph.instagram.com/v21.0/me/media?')
      ? {
          body: {
            data: [
              { id: '30', media_type: 'IMAGE', permalink: 'https://www.instagram.com/p/NOPIC/' }, // no picture: skipped
              { id: '20', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/cake.jpg', permalink: 'https://www.instagram.com/p/CAKE/', caption: 'Cake + coffee €7\n#cake' },
              { id: '10', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/old.jpg', permalink: 'https://www.instagram.com/p/OLD/' },
            ],
          },
        }
      : undefined,
  );
  assert.deepEqual(await getLatestInstagramPost(120), { mediaId: '20', caption: 'Cake + coffee €7' });
});

test('Café TV: with Instagram not answering, the read fails (so the screen keeps its last post)', async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'expired';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork(() => ({ status: 400, body: { error: { code: 190 } } }));
  await assert.rejects(getLatestInstagramPost(120));
});

test('Café TV: with no Instagram token there is no post (the screen shows its poster)', async () => {
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork(() => undefined);
  assert.equal(await getLatestInstagramPost(120), null);
  assert.equal(calls.length, 0, 'Instagram is not asked');
});

test("Café TV: a post's picture is asked for afresh by its id; a video gives its still", async () => {
  process.env.INSTAGRAM_ACCESS_TOKEN = 'unit-token';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  fakeNetwork((url) =>
    url.startsWith('https://graph.instagram.com/v21.0/20?')
      ? { body: { id: '20', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/cake.jpg' } }
      : url.startsWith('https://graph.instagram.com/v21.0/21?')
        ? { body: { id: '21', media_type: 'VIDEO', media_url: 'https://x/reel.mp4', thumbnail_url: 'https://scontent.cdninstagram.com/still.jpg' } }
        : { status: 400, body: { error: { code: 100 } } },
  );
  assert.equal(await getInstagramPostImageUrl('20'), 'https://scontent.cdninstagram.com/cake.jpg');
  assert.equal(await getInstagramPostImageUrl('21'), 'https://scontent.cdninstagram.com/still.jpg');
  assert.equal(await getInstagramPostImageUrl('99'), null, 'not one of ours');
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
