import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clubMoney, clubOfferLine, parseAgentClub } from '@/features/club/agentClub';
import { joinClub } from '@/server/businessAgent/accounts';
import { getAgentClub } from '@/server/businessAgent/clubFeed';
import { en } from '@/i18n/content/en';
import { es } from '@/i18n/content/es';

/**
 * Selling the coffee club. The public club feed
 * (src/server/businessAgent/clubFeed.ts): kept while the agent is down, dropped
 * when it says there's no club. And joining
 * (src/server/businessAgent/accounts.ts): asked with the website key, the email
 * only in the body, the agent's two "no"s passed on, anything else
 * "unavailable", never a thrown error or an address in the logs.
 *
 * Run with `npm run test:unit`.
 */

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let calls: { url: string; method: string; body: Record<string, unknown>; auth: string | null }[] = [];
let answers: Array<() => Promise<Response>> = [];
let logged: unknown[][] = [];
const realError = console.error;
const realWarn = console.warn;

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const down = async (): Promise<Response> => {
  throw new Error('connect ECONNREFUSED');
};

beforeEach(() => {
  calls = [];
  answers = [];
  logged = [];
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test_key';
  process.env.BUSINESS_AGENT_CLUB_URL = 'https://agent.test/api/site/1/club';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: JSON.parse(String(init?.body ?? '{}')),
      auth: headers.get('authorization'),
    });
    const next = answers.shift();
    return next ? next() : new Response('{}', { status: 500 });
  }) as typeof fetch;
  console.error = (...args: unknown[]) => { logged.push(args); };
  console.warn = (...args: unknown[]) => { logged.push(args); };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...savedEnv };
  console.error = realError;
  console.warn = realWarn;
});

const REDIRECT = 'https://cafe.test/en/account?club=joined';
const join = () => joinClub('  Lucia@Example.COM ', REDIRECT);

test('joining: Square’s checkout link, asked with the key and the email in the body only', async () => {
  answers = [json({ url: 'https://square.link/u/abc123' })];
  assert.deepEqual(await join(), { url: 'https://square.link/u/abc123' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/account/club/join');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].auth, 'Bearer nl_test_key');
  assert.deepEqual(calls[0].body, { email: 'lucia@example.com', email_verified: true, redirect_url: REDIRECT });
});

test('the agent’s two clear noes are passed on', async () => {
  for (const error of ['already_a_member', 'not_taking_members'] as const) {
    answers = [json({ error }, 409)];
    assert.deepEqual(await join(), { error });
  }
  assert.equal(logged.length, 0);
});

test('anything else is "unavailable": nothing thrown, no address logged', async () => {
  const unavailable = { error: 'unavailable' };

  process.env.BUSINESS_AGENT_SITE_URL = 'off';
  assert.deepEqual(await join(), unavailable);
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  delete process.env.BUSINESS_AGENT_NEWSLETTER_KEY;
  assert.deepEqual(await join(), unavailable);
  assert.equal(calls.length, 0);
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test_key';

  for (const answer of [
    json({ fields: ['redirect_url'] }, 400),
    json({ error: 'unauthorised' }, 401),
    json({ error: 'email_not_verified' }, 403),
    json({ error: 'Not found' }, 404),
    json({ error: 'something_new' }, 409),
    json({}, 500),
    async () => new Response('<html>Bad gateway</html>', { status: 502 }),
    async () => new Response('not json', { status: 200 }),
    json(null),
    json({}),
    json({ url: 'javascript:alert(1)' }),
    down,
  ]) {
    answers = [answer];
    assert.deepEqual(await join(), unavailable);
  }

  assert.ok(logged.length >= 12);
  assert.ok(!JSON.stringify(logged).toLowerCase().includes('lucia@example.com'));
});

const feed = {
  version: 1,
  business: { id: 1, name: 'Easy Beans Coffee' },
  club: { name: 'Coffee club', price: 10, currency: 'EUR', coffees_per_week: 1, max_value: 5, taking_members: true, signup_url: null },
  generated_at: '2026-11-26T09:00:00Z',
};

test('the club feed is checked: half an offer is no offer, and joining is shut unless said open', () => {
  assert.deepEqual(parseAgentClub(feed)?.club, {
    name: 'Coffee club', price: 10, currency: 'EUR', coffees_per_week: 1, max_value: 5, taking_members: true,
  });
  assert.equal(parseAgentClub({ ...feed, club: { ...feed.club, taking_members: undefined } })?.club.taking_members, false);
  assert.equal(parseAgentClub({ ...feed, club: { ...feed.club, max_value: null } })?.club.max_value, null);
  for (const broken of [
    null,
    { ...feed, version: 2 },
    { ...feed, club: undefined },
    { ...feed, club: { ...feed.club, name: ' ' } },
    { ...feed, club: { ...feed.club, price: '10' } },
    { ...feed, club: { ...feed.club, coffees_per_week: 0 } },
    { ...feed, club: { ...feed.club, currency: 'euros' } },
  ]) {
    assert.equal(parseAgentClub(broken), null);
  }
});

test('the offer in words, in both languages', () => {
  const { club } = parseAgentClub(feed)!;
  assert.equal(clubOfferLine(club, en.club, 'en'), '1 coffee a week for €10 a month');
  assert.equal(clubOfferLine({ ...club, coffees_per_week: 3 }, en.club, 'en'), '3 coffees a week for €10 a month');
  // Intl puts a no-break space before the euro sign in Spanish.
  assert.equal(clubOfferLine(club, es.club, 'es').replace(/ /g, ' '), '1 café a la semana por 10 € al mes');
  assert.equal(clubMoney(4.5, 'EUR', 'en'), '€4.50');
});

test('the feed keeps the last club while the agent is down, and drops it when there is none', async () => {
  answers = [down];
  assert.equal(await getAgentClub(), null);
  answers = [json(feed)];
  assert.equal((await getAgentClub())?.club.name, 'Coffee club');
  answers = [json({ error: 'unavailable' }, 503)];
  assert.equal((await getAgentClub())?.club.name, 'Coffee club');
  answers = [down];
  assert.equal((await getAgentClub())?.club.name, 'Coffee club');
  answers = [json({ error: 'Not found' }, 404)];
  assert.equal(await getAgentClub(), null);
  // And it stays gone while the agent is then down.
  answers = [down];
  assert.equal(await getAgentClub(), null);
});
