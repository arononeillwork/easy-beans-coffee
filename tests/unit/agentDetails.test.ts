import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_DETAILS, cafeDetails, nextWeekOf, parseAgentDetails, weekOf } from '@/features/details/agentDetails';
import { agentDetailsUrl, getCafeDetails } from '@/server/businessAgent/detailsFeed';
import { getOrderingHours } from '@/server/places/orderingHours';

/**
 * The café's details from the Business Agent: address, contacts, social
 * accounts, opening hours and the days it's closed. What must hold: the site
 * shows what the agent says (a change there is a change here), the days it's
 * closed close "open now" and online ordering too, and an agent that's down
 * never breaks a page (the last details read, else the built-in ones).
 *
 * Run with `npm run test:unit`.
 */

const FEED = {
  version: 1,
  business: { id: 1, name: 'Easy Beans Coffee' },
  address: 'Calle Pizarro 8, 29670 San Pedro de Alcántara, Málaga',
  address_lines: ['Calle Pizarro 8', '29670 San Pedro de Alcántara', 'Málaga'],
  maps_url: 'https://www.google.com/maps/search/?api=1&query=Easy%20Beans',
  phone: '+34 952 000 000',
  whatsapp: '+34 600 111 222',
  whatsapp_url: 'https://wa.me/34600111222',
  email: 'hola@easybeans.example',
  website: null,
  social: {
    instagram: { handle: 'easy.beans.coffee', url: 'https://www.instagram.com/easy.beans.coffee' },
    tiktok: null,
  },
  timezone: 'Europe/Madrid',
  hours: {
    mon: { open: '07:45', close: '16:15' }, tue: { open: '07:45', close: '16:15' }, wed: { open: '07:45', close: '16:15' },
    thu: { open: '07:45', close: '16:15' }, fri: { open: '07:45', close: '16:15' }, sat: { open: '10:00', close: '14:00' }, sun: null,
  },
  closures: [{ from: '2026-12-24', to: '2026-12-25', reason: 'Closed for Christmas' }],
  days: [
    { date: '2026-12-21', day: 'mon', open: '07:45', close: '16:15', closed_reason: null },
    { date: '2026-12-22', day: 'tue', open: '07:45', close: '16:15', closed_reason: null },
    { date: '2026-12-23', day: 'wed', open: '07:45', close: '16:15', closed_reason: null },
    { date: '2026-12-24', day: 'thu', open: null, close: null, closed_reason: 'Closed for Christmas' },
    { date: '2026-12-25', day: 'fri', open: null, close: null, closed_reason: 'Closed for Christmas' },
    { date: '2026-12-26', day: 'sat', open: '10:00', close: '14:00', closed_reason: null },
    { date: '2026-12-27', day: 'sun', open: null, close: null, closed_reason: null },
  ],
  generated_at: '2026-12-21T09:00:00Z',
};

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
const realWarn = console.warn;
let calls: string[] = [];
let answer: () => Promise<Response>;

beforeEach(() => {
  calls = [];
  answer = async () => new Response(JSON.stringify(FEED), { status: 200 });
  delete process.env.BUSINESS_AGENT_DETAILS_URL;
  delete process.env.VERCEL;
  delete process.env.E2E_FEEDS_BASE;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return answer();
  }) as typeof fetch;
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...savedEnv };
  console.warn = realWarn;
});

test('the feed is read as the agent gives it; anything else is not a details feed', () => {
  const d = parseAgentDetails(FEED);
  assert.ok(d);
  assert.equal(d.address_lines[0], 'Calle Pizarro 8');
  assert.equal(d.social.tiktok, null);
  assert.equal(parseAgentDetails({ ...FEED, version: 2 }), null);
  assert.equal(parseAgentDetails({ error: 'not shared' }), null);
  assert.equal(parseAgentDetails(null), null);
  // A link that isn't https, or an hour that isn't one, is left out rather than shown.
  const odd = parseAgentDetails({ ...FEED, whatsapp_url: 'javascript:alert(1)', hours: { ...FEED.hours, mon: { open: '25:00', close: '16:15' } } });
  assert.equal(odd?.whatsapp_url, null);
  assert.equal(odd?.hours.mon, null);
});

test('the usual week and the next one by weekday: a closure this week shuts that day', () => {
  const d = parseAgentDetails(FEED)!;
  const week = weekOf(d);
  assert.deepEqual(week.map((w) => w.day), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(week.find((w) => w.day === 4)?.ranges, [{ open: 7 * 60 + 45, close: 16 * 60 + 15 }]);
  assert.deepEqual(week.find((w) => w.day === 0)?.ranges, []);
  const next = nextWeekOf(d);
  assert.deepEqual(next.find((w) => w.day === 4)?.ranges, [], 'Thursday the 24th: closed for Christmas');
  assert.deepEqual(next.find((w) => w.day === 5)?.ranges, [], 'Friday the 25th too');
  assert.deepEqual(next.find((w) => w.day === 6)?.ranges, [{ open: 600, close: 840 }]);
});

test('the pages’ view: the agent’s contacts as links, its time zone, its closures', () => {
  const c = cafeDetails(parseAgentDetails(FEED)!);
  assert.equal(c.source, 'agent');
  assert.equal(c.whatsappUrl, 'https://wa.me/34600111222');
  assert.equal(c.instagram?.url, 'https://www.instagram.com/easy.beans.coffee');
  assert.equal(c.timeZone, 'Europe/Madrid');
  assert.deepEqual(c.closures, FEED.closures);
});

test('a laptop or a test run reads nothing; a Vercel deployment reads the live agent', () => {
  assert.equal(agentDetailsUrl(), null);
  process.env.VERCEL = '1';
  assert.equal(agentDetailsUrl(), 'https://businesssagent.com/api/site/1/details');
  process.env.BUSINESS_AGENT_DETAILS_URL = 'off';
  assert.equal(agentDetailsUrl(), null);
});

test('a change in the agent is what the site shows, ordering included', async () => {
  process.env.BUSINESS_AGENT_DETAILS_URL = 'https://agent.test/api/site/1/details';
  const first = await getCafeDetails();
  assert.equal(first.source, 'agent');
  assert.equal(first.address, 'Calle Pizarro 8, 29670 San Pedro de Alcántara, Málaga');
  assert.equal(calls[0], 'https://agent.test/api/site/1/details');
  // Open on Sundays now: the agent's week and its next days both say so.
  answer = async () => new Response(JSON.stringify({ ...FEED, email: 'nuevo@easybeans.example',
    hours: { ...FEED.hours, sun: { open: '10:00', close: '13:00' } },
    days: FEED.days.map((d) => (d.day === 'sun' ? { ...d, open: '10:00', close: '13:00' } : d)) }), { status: 200 });
  const changed = await getCafeDetails();
  assert.equal(changed.email, 'nuevo@easybeans.example');
  const ordering = await getOrderingHours();
  assert.equal(ordering.source, 'agent');
  assert.deepEqual(ordering.hours.find((d) => d.day === 0)?.ranges, [{ open: 600, close: 780 }]);
});

test('an agent that is down serves the last details read, and with none the built-in ones', async () => {
  process.env.BUSINESS_AGENT_DETAILS_URL = 'https://agent.test/api/site/1/details';
  await getCafeDetails();
  answer = async () => new Response('{"error":"down"}', { status: 503 });
  const kept = await getCafeDetails();
  assert.equal(kept.source, 'agent');
  assert.equal(kept.address, FEED.address);
  // Switched off in the agent (404) is no different: the page still has details.
  answer = async () => { throw new TypeError('fetch failed'); };
  assert.equal((await getCafeDetails()).source, 'agent');
  delete process.env.BUSINESS_AGENT_DETAILS_URL;
  const built = await getCafeDetails();
  assert.equal(built.source, 'fallback');
  assert.equal(built.address, FALLBACK_DETAILS.address);
});

test('a closure on the agent’s Calendar this week closes online ordering that day', async () => {
  process.env.BUSINESS_AGENT_DETAILS_URL = 'https://agent.test/api/site/1/details';
  const { hours, source } = await getOrderingHours();
  assert.equal(source, 'agent');
  assert.deepEqual(hours.find((d) => d.day === 4)?.ranges, [], 'Thursday the 24th: closed for Christmas');
  assert.deepEqual(hours.find((d) => d.day === 3)?.ranges, [{ open: 7 * 60 + 45, close: 16 * 60 + 15 }]);
});
