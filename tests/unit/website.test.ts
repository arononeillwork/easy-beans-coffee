import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecordForm, qualifyName } from '@/server/website/cloudflareDns';
import { normaliseDomain } from '@/server/website/vercelDomains';
import { extractSnapshot, normaliseSiteUrl, snapshotSite } from '@/server/website/siteSnapshot';

/**
 * The /admin/website seams that need no network: how DNS forms are read, how
 * names are qualified, and what the redesign reader keeps from a page.
 *
 * Run with `npm run test:unit`.
 */

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

test('record names are qualified against the zone', () => {
  assert.equal(qualifyName('@', 'easybeanscoffee.com'), 'easybeanscoffee.com');
  assert.equal(qualifyName('', 'easybeanscoffee.com'), 'easybeanscoffee.com');
  assert.equal(qualifyName('WWW', 'easybeanscoffee.com'), 'www.easybeanscoffee.com');
  assert.equal(qualifyName('www.easybeanscoffee.com.', 'easybeanscoffee.com'), 'www.easybeanscoffee.com');
  assert.equal(qualifyName('_vercel', 'easybeanscoffee.com'), '_vercel.easybeanscoffee.com');
});

test('a DNS form is parsed into a record, proxy and priority included', () => {
  assert.deepEqual(parseRecordForm(form({ type: 'a', name: '@', content: '76.76.21.21', ttl: '1', proxied: 'on' })), {
    type: 'A',
    name: '@',
    content: '76.76.21.21',
    ttl: 1,
    proxied: true,
    priority: undefined,
    comment: undefined,
  });
  const mx = parseRecordForm(form({ type: 'MX', name: '@', content: 'mx.example.com', ttl: '3600', priority: '5' }));
  assert.equal(typeof mx === 'object' && mx.priority, 5);
});

test('bad DNS input comes back as a message, not a request', () => {
  assert.match(parseRecordForm(form({ type: 'PTR', name: '@', content: 'x' })) as string, /Unsupported/);
  assert.match(parseRecordForm(form({ type: 'A', name: '@', content: 'not-an-ip', ttl: '1' })) as string, /IPv4/);
  assert.match(parseRecordForm(form({ type: 'TXT', name: '@', content: '', ttl: '1' })) as string, /value/);
  assert.match(parseRecordForm(form({ type: 'TXT', name: '@', content: 'x', ttl: '5' })) as string, /TTL/);
  assert.match(parseRecordForm(form({ type: 'MX', name: '@', content: 'x', ttl: '1', priority: '-1' })) as string, /Priority/);
});

test('domains are normalised from whatever gets pasted', () => {
  assert.equal(normaliseDomain('https://WWW.EasyBeansCoffee.com/menu'), 'www.easybeanscoffee.com');
  assert.equal(normaliseDomain('easybeanscoffee.com'), 'easybeanscoffee.com');
  assert.equal(normaliseDomain('localhost'), null);
  assert.equal(normaliseDomain('bad_domain.com'), null);
});

test('site addresses default to https', () => {
  assert.equal(normaliseSiteUrl('example.com')?.toString(), 'https://example.com/');
  assert.equal(normaliseSiteUrl('http://example.com/a')?.toString(), 'http://example.com/a');
  assert.equal(normaliseSiteUrl('   '), null);
});

test('the redesign reader keeps content and drops markup and scripts', () => {
  const html = `<!doctype html><html><head>
    <title>Café Sol &amp; Luna</title>
    <meta name="description" content="Coffee by the sea">
    <style>body{color:#3b2a20} .x{background:#F79BA4} .y{color:#3B2A20}</style>
    <script>document.write('<h1>Injected</h1>')</script>
  </head><body>
    <!-- <h2>Hidden comment</h2> -->
    <nav><a href="/menu">Menu</a><a href="https://instagram.com/sol">Instagram</a></nav>
    <h1>Welcome to <em>Sol</em></h1>
    <p>Open daily from 8:00.</p><p>Open daily from 8:00.</p>
    <img src="/img/front.jpg" alt="Our terrace"><img src="data:image/png;base64,xx">
  </body></html>`;
  const snap = extractSnapshot(html, new URL('https://sol.example/'));

  assert.equal(snap.title, 'Café Sol & Luna');
  assert.equal(snap.description, 'Coffee by the sea');
  assert.deepEqual(snap.headings, ['Welcome to Sol']);
  assert.deepEqual(snap.paragraphs, ['Open daily from 8:00.']);
  assert.deepEqual(snap.links, [
    { text: 'Menu', href: 'https://sol.example/menu' },
    { text: 'Instagram', href: 'https://instagram.com/sol' },
  ]);
  assert.deepEqual(snap.images, [{ src: 'https://sol.example/img/front.jpg', alt: 'Our terrace' }]);
  assert.equal(snap.colours[0], '#3b2a20');
});

test('the redesign reader refuses private and non-web addresses', async () => {
  await assert.rejects(snapshotSite('http://127.0.0.1/'), /private network/);
  await assert.rejects(snapshotSite('http://[::1]/'), /private network/);
  await assert.rejects(snapshotSite('http://169.254.169.254/latest/meta-data'), /private network/);
  await assert.rejects(snapshotSite('ftp://example.com/'), /http and https/);
});
