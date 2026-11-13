import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { eraseAccountInAgent, readAccountSummary, syncAccountToAgent } from '@/server/businessAgent/account';

/**
 * Accounts & rewards read from the Business Agent (the café's back office).
 * What must hold: each call goes to its address with the website key, the
 * email only in the body (trimmed, lowercased) with "email_verified": true;
 * a laptop or a test run calls nothing; and anything but a good answer (off,
 * no key, a 404, an error, a slow agent) is null: the rewards card stays
 * hidden, nothing throws, and no address reaches the logs.
 *
 * Run with `npm run test:unit`.
 */

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let calls: { url: string; init: RequestInit }[] = [];
let answer: () => Promise<Response>;
let logged: unknown[][] = [];
const realError = console.error;
const realWarn = console.warn;

const SUMMARY = {
  customer: { id: 'c-1', first_name: 'Ana' },
  points: { program: { one: 'Bean', other: 'Beans', tiers: [{ id: 'T1', name: 'Free coffee', points: 10 }] }, balance: 7, lifetime: 23 },
  credit: { balance: 1.25, pending: 0.4, gift_card_linked: true, lines: [] },
  cashback: { on: true, per_1000_views: 0.5, per_100_likes: 0.2, per_follower: 0.1, max: 15 },
  rep: null,
};

beforeEach(() => {
  calls = [];
  logged = [];
  answer = async () => new Response(JSON.stringify(SUMMARY), { status: 200 });
  delete process.env.BUSINESS_AGENT_SITE_URL;
  delete process.env.BUSINESS_AGENT_NEWSLETTER_KEY;
  delete process.env.VERCEL;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return answer();
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

const live = () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
};

test('the summary is asked with the key, the email only in the body, said to be verified', async () => {
  live();
  const summary = await readAccountSummary('  Ana@Example.COM ');
  assert.deepEqual(summary, SUMMARY);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/account/summary');
  assert.ok(!calls[0].url.toLowerCase().includes('ana'));
  assert.equal(calls[0].init.method, 'POST');
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer nl_test');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { email: 'ana@example.com', email_verified: true });
  assert.ok(calls[0].init.signal, 'a timeout');
});

test('sync sends what we know, and nothing empty', async () => {
  live();
  answer = async () => new Response(JSON.stringify({ customer_id: 'c-1', created: true, is_rep: false, ignored: [] }), { status: 200 });
  const done = await syncAccountToAgent({ email: 'ana@example.com', name: 'Ana García', phone: ' ', squareCustomerId: 'SQC1', lang: 'es' });
  assert.deepEqual(done, { customer_id: 'c-1', created: true, is_rep: false, ignored: [] });
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/account/sync');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    email: 'ana@example.com', email_verified: true, name: 'Ana García', square_customer_id: 'SQC1', lang: 'es',
  });
  assert.ok(!('marketing_consent' in JSON.parse(String(calls[0].init.body))));
});

test('erase goes to its own address', async () => {
  live();
  answer = async () => new Response(JSON.stringify({ erased: true, kept: 'ledger', found: true }), { status: 200 });
  assert.deepEqual(await eraseAccountInAgent('ana@example.com'), { erased: true, kept: 'ledger', found: true });
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/account/erase');
});

test('a laptop or a test run calls nothing; without a key nothing is sent and the log says why', async () => {
  assert.equal(await readAccountSummary('ana@example.com'), null);
  assert.equal(calls.length, 0);
  process.env.VERCEL = '1';
  assert.equal(await readAccountSummary('ana@example.com'), null);
  assert.equal(calls.length, 0);
  assert.match(String(logged[0]?.[0]), /BUSINESS_AGENT_NEWSLETTER_KEY is not set/);
});

test('fails closed: off (404), an error, a broken answer or no agent is null, never a throw, and no address in the logs', async () => {
  live();
  answer = async () => new Response('{"error":"off"}', { status: 404 });
  assert.equal(await readAccountSummary('ana@example.com'), null);
  answer = async () => new Response('{"error":"down"}', { status: 503 });
  assert.equal(await readAccountSummary('ana@example.com'), null);
  answer = async () => new Response('not json', { status: 200 });
  assert.equal(await syncAccountToAgent({ email: 'ana@example.com' }), null);
  answer = async () => { throw new DOMException('The operation timed out.', 'TimeoutError'); };
  assert.equal(await eraseAccountInAgent('ana@example.com'), null);
  // A 404 is the café having accounts off: not a fault, so not logged.
  assert.deepEqual(logged.map((l) => l[1]), [{ outcome: 'http_503' }, { outcome: 'bad_answer' }, { outcome: 'unreachable' }]);
  assert.ok(!JSON.stringify(logged).toLowerCase().includes('ana'));
});

test('a summary that isn’t one is null', async () => {
  live();
  answer = async () => new Response(JSON.stringify({ something: 'else' }), { status: 200 });
  assert.equal(await readAccountSummary('ana@example.com'), null);
  answer = async () => new Response(JSON.stringify({ customer: null }), { status: 200 });
  assert.deepEqual(await readAccountSummary('ana@example.com'), { customer: null });
});
