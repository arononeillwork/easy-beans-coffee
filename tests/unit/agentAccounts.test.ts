import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clubFor } from '@/server/businessAgent/accounts';

/**
 * The coffee club on the account page, read from the Business Agent
 * (src/server/businessAgent/accounts.ts). What must hold: it asks with the
 * website key, the email only in the body and said to be checked; someone the
 * agent doesn't know is synced first (with their Square customer); and an agent
 * that's off, down or says no is simply no club card, never a thrown error or
 * an address in the logs.
 *
 * Run with `npm run test:unit`.
 */

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
let answers: Array<() => Promise<Response>> = [];
let logged: unknown[][] = [];
const realError = console.error;
const realWarn = console.warn;

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const club = {
  name: 'Coffee club', price: 10, currency: 'EUR', coffees_per_week: 1, join_url: null,
  pass: { standing: 'active', used_this_week: 0, left_this_week: 1, week_start: '2026-11-23', started_on: '2026-11-01', ends_on: null, card_code: '7Q2K9XMB' },
};

beforeEach(() => {
  calls = [];
  answers = [];
  logged = [];
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test_key';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')), auth: headers.get('authorization') });
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

const person = { email: '  Lucia@Example.COM ', squareCustomerId: 'SQC1', name: 'Lucía García' };

test('a member: the summary’s club, asked with the key and the email in the body only', async () => {
  answers = [json({ customer: { id: 'c1', first_name: 'Lucía' }, club })];
  assert.deepEqual(await clubFor(person), club);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/account/summary');
  assert.equal(calls[0].auth, 'Bearer nl_test_key');
  assert.deepEqual(calls[0].body, { email: 'lucia@example.com', email_verified: true });
});

test('a business without a club: no card', async () => {
  answers = [json({ customer: { id: 'c1', first_name: 'Lucía' } })];
  assert.equal(await clubFor(person), null);
});

test('someone the agent doesn’t know yet is synced first, with their Square customer, then read', async () => {
  answers = [json({ customer: null }), json({ customer_id: 'c9', created: true, is_rep: false, ignored: [] }), json({ customer: { id: 'c9', first_name: 'Lucía' }, club })];
  assert.deepEqual(await clubFor(person), club);
  assert.deepEqual(calls.map((c) => c.url.split('/').slice(-2).join('/')), ['account/summary', 'account/sync', 'account/summary']);
  assert.deepEqual(calls[1].body, { email: 'lucia@example.com', email_verified: true, name: 'Lucía García', square_customer_id: 'SQC1' });
});

test('off, no key, accounts not on, or the agent down: no card, nothing thrown, no address logged', async () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'off';
  assert.equal(await clubFor(person), null);
  assert.equal(calls.length, 0);

  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  delete process.env.BUSINESS_AGENT_NEWSLETTER_KEY;
  assert.equal(await clubFor(person), null);
  assert.equal(calls.length, 0);

  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test_key';
  answers = [json({ error: 'This business doesn’t have accounts on its website.' }, 404)];
  assert.equal(await clubFor(person), null);
  answers = [async () => { throw new Error('connect ECONNREFUSED'); }];
  assert.equal(await clubFor(person), null);
  answers = [json({ customer: null }), json({ error: 'nope' }, 503)];
  assert.equal(await clubFor(person), null);

  assert.ok(logged.length >= 3);
  assert.ok(!JSON.stringify(logged).toLowerCase().includes('lucia@example.com'));
});
