// Local stand-in for the third-party feeds the site reads automatically (and the
// Business Agent's details feed).
//
// The site is pointed here through E2E_FEEDS_BASE (see src/server/feedBase.ts
// and playwright.config.ts), so the browser suite exercises the real path —
// API answer → server code → what a visitor sees — without touching Google or
// Instagram. The values are deliberately unlike the café's real ones (7:45,
// 16:15, 4.6★ from 37) so a pass can only come from this feed, never from the
// built-in fallbacks.
//
// Started by Playwright as a second webServer; plain Node, no dependencies.
import { createServer } from 'node:http';
import { FIXTURE } from './mockFeedsFixture.mjs';

const PORT = Number(process.env.MOCK_FEEDS_PORT ?? 3299);

function periods() {
  const list = [];
  for (let day = 1; day <= 5; day++) {
    list.push({
      open: { day, ...FIXTURE.weekdayOpen },
      close: { day, ...FIXTURE.weekdayClose },
    });
  }
  list.push({ open: { day: 6, ...FIXTURE.saturdayOpen }, close: { day: 6, ...FIXTURE.saturdayClose } });
  return list;
}

function place() {
  return {
    id: 'e2e-place',
    rating: FIXTURE.rating,
    userRatingCount: FIXTURE.total,
    googleMapsUri: 'https://maps.google.com/?cid=e2e',
    googleMapsLinks: {
      reviewsUri: 'https://maps.google.com/?cid=e2e&reviews',
      writeAReviewUri: 'https://maps.google.com/?cid=e2e&write',
    },
    regularOpeningHours: { periods: periods() },
    currentOpeningHours: { periods: periods() },
  };
}

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (t) => `${pad(t.hour)}:${pad(t.minute)}`;

/** The Business Agent's details feed (GET /api/site/1/details), as docs/WEBSITE.md in business-agent has it. */
function agentDetails() {
  const weekday = { open: hhmm(FIXTURE.weekdayOpen), close: hhmm(FIXTURE.weekdayClose) };
  const hours = { mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday,
    sat: { open: hhmm(FIXTURE.saturdayOpen), close: hhmm(FIXTURE.saturdayClose) }, sun: null };
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const date = (offset) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return { iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, day: keys[d.getDay()] };
  };
  const closure = date(FIXTURE.agent.closureInDays);
  const days = Array.from({ length: 14 }, (_, i) => {
    const { iso, day } = date(i);
    const shut = i === FIXTURE.agent.closureInDays && hours[day];
    return { date: iso, day, open: shut ? null : hours[day]?.open ?? null, close: shut ? null : hours[day]?.close ?? null,
      closed_reason: shut ? FIXTURE.agent.closureReason : null };
  });
  return {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee' },
    address: FIXTURE.agent.address,
    address_lines: FIXTURE.agent.address.split(',').map((s) => s.trim()),
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Easy%20Beans%20E2E',
    phone: null,
    whatsapp: FIXTURE.agent.whatsapp,
    whatsapp_url: FIXTURE.agent.whatsappUrl,
    email: FIXTURE.agent.email,
    website: null,
    social: {
      instagram: { handle: 'easy.beans.coffee', url: 'https://www.instagram.com/easy.beans.coffee' },
      tiktok: { handle: 'easybeanscoffee', url: 'https://www.tiktok.com/@easybeanscoffee' },
    },
    timezone: 'Europe/Madrid',
    hours,
    closures: [{ from: closure.iso, to: closure.iso, reason: FIXTURE.agent.closureReason }],
    days,
    generated_at: new Date().toISOString(),
  };
}

function media(post, i) {
  return {
    id: post.id,
    caption: `${post.caption}\n#easybeans`,
    media_type: i === 2 ? 'VIDEO' : 'IMAGE',
    // Same-origin photography, so next/image needs no remote host for it.
    media_url: '/media/acai-bowl.webp',
    thumbnail_url: '/media/ube-latte.webp',
    permalink: post.permalink,
    timestamp: `2026-10-1${i}T10:00:00+0000`,
  };
}

function instagram() {
  return { data: FIXTURE.posts.map(media) };
}

/** One post by its id, as the café TV's picture route asks for it. */
function instagramPost(id) {
  const i = FIXTURE.posts.findIndex((post) => post.id === id);
  return i === -1 ? undefined : media(FIXTURE.posts[i], i);
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/health') return json(res, 200, { ok: true });
  if (pathname.startsWith('/places/v1/places/') && !pathname.includes('/photos/')) {
    return json(res, 200, place());
  }
  const postId = /^\/instagram\/v[\d.]+\/(\d+)$/.exec(pathname)?.[1];
  if (postId) {
    const post = instagramPost(postId);
    return post ? json(res, 200, post) : json(res, 400, { error: { code: 100 } });
  }
  if (pathname.startsWith('/instagram/')) return json(res, 200, instagram());
  if (pathname === '/agent/api/site/1/details') return json(res, 200, agentDetails());
  // TikTok, Square and anything else: answer like an unconfigured service.
  return json(res, 404, { error: 'not mocked' });
}).listen(PORT, () => {
  console.log(`[mock-feeds] listening on ${PORT}`);
});
