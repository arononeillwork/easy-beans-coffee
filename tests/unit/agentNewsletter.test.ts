import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { agentSiteUrl, sendSignupToAgent, sendUnsubscribeToAgent } from '@/server/businessAgent/newsletter';

/**
 * Sign-ups and unsubscribes sent on to the Business Agent (the café's
 * customers). What must hold: it goes where it should with the website key,
 * a laptop or a test run sends nothing, and a Business Agent that's down or
 * says no never costs a sign-up (nothing throws) or leaks an address to logs.
 *
 * Run with `npm run test:unit`.
 */

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let calls: { url: string; init: RequestInit }[] = [];
let answer: () => Promise<Response> = async () => new Response('{"ok":true}', { status: 200 });
let logged: unknown[][] = [];
const realError = console.error;
const realWarn = console.warn;

beforeEach(() => {
  calls = [];
  logged = [];
  answer = async () => new Response('{"ok":true}', { status: 200 });
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

const signup = {
  email: '  Lucia@Example.COM ',
  interests: ['english', 'offers', 'english'],
  phone: '+34 600 111 222',
  lang: 'es' as const,
  place: 'first_visit_popup',
};

test('a laptop or a test run sends nothing; a Vercel deployment sends to the live agent', () => {
  assert.equal(agentSiteUrl(), null);
  process.env.VERCEL = '1';
  assert.equal(agentSiteUrl(), 'https://businesssagent.com/api/site/1');
  process.env.BUSINESS_AGENT_SITE_URL = 'off';
  assert.equal(agentSiteUrl(), null);
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/7/';
  assert.equal(agentSiteUrl(), 'https://agent.test/api/site/7');
});

test('a sign-up goes to the agent with the website key, as the contract asks', async () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
  await sendSignupToAgent(signup);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/signup');
  assert.equal(calls[0].init.method, 'POST');
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer nl_test');
  assert.equal(headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    email: 'lucia@example.com',
    interests: ['english', 'offers'],
    phone: '+34 600 111 222',
    lang: 'es',
    place: 'first_visit_popup',
  });
});

test('a competition entry goes with the name and no empty phone', async () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
  await sendSignupToAgent({ email: 'ana@example.com', interests: [], phone: null, name: 'Ana Ruiz', lang: 'en', place: 'competition' });
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    email: 'ana@example.com', interests: [], name: 'Ana Ruiz', lang: 'en', place: 'competition',
  });
});

test('an unsubscribe goes to the agent with the key', async () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
  await sendUnsubscribeToAgent(' Lucia@Example.com ');
  assert.equal(calls[0].url, 'https://agent.test/api/site/1/unsubscribe');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { email: 'lucia@example.com' });
});

test('without a key or switched off, nothing is sent; a missing key is said in the logs', async () => {
  process.env.VERCEL = '1';
  await sendSignupToAgent(signup);
  assert.equal(calls.length, 0);
  assert.match(String(logged[0]?.[0]), /BUSINESS_AGENT_NEWSLETTER_KEY is not set/);
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
  process.env.BUSINESS_AGENT_SITE_URL = 'off';
  await sendSignupToAgent(signup);
  await sendUnsubscribeToAgent('lucia@example.com');
  assert.equal(calls.length, 0);
});

test('an agent that is down or says no never throws, and no address reaches the logs', async () => {
  process.env.BUSINESS_AGENT_SITE_URL = 'https://agent.test/api/site/1';
  process.env.BUSINESS_AGENT_NEWSLETTER_KEY = 'nl_test';
  answer = async () => new Response('{"error":"nope"}', { status: 503 });
  await sendSignupToAgent(signup);
  answer = async () => { throw new TypeError('fetch failed'); };
  await sendSignupToAgent(signup);
  await sendUnsubscribeToAgent('lucia@example.com');
  assert.equal(calls.length, 3);
  assert.deepEqual(logged.map((l) => l[1]), [{ outcome: 'http_503' }, { outcome: 'unreachable' }, { outcome: 'unreachable' }]);
  assert.ok(!JSON.stringify(logged).toLowerCase().includes('lucia'));
});
