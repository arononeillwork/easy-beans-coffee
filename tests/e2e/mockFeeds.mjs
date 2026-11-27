// Local stand-in for the feeds the site reads automatically: the Business
// Agent's (details, Google reviews, Instagram posts, coffee club) and
// Instagram's own, which only the café TV's poster mode still reads.
//
// The site is pointed here through E2E_FEEDS_BASE (see src/server/feedBase.ts
// and playwright.config.ts), so the browser suite exercises the real path —
// API answer → server code → what a visitor sees — without touching the agent,
// Google or Instagram. The values are deliberately unlike the café's real ones (7:45,
// 16:15, 4.6★ from 37) so a pass can only come from this feed, never from the
// built-in fallbacks.
//
// Started by Playwright as a second webServer; plain Node, no dependencies.
import { createServer } from 'node:http';
import { FIXTURE } from './mockFeedsFixture.mjs';

const PORT = Number(process.env.MOCK_FEEDS_PORT ?? 3299);

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

/** The Business Agent's Google rating and reviews (GET /api/site/1/reviews), as docs/WEBSITE.md in business-agent has it. */
function agentReviews() {
  return {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee' },
    source: 'business_profile',
    rating: FIXTURE.rating,
    count: FIXTURE.total,
    maps_url: FIXTURE.agent.mapsUrl,
    write_review_url: FIXTURE.agent.writeReviewUrl,
    reviews: [
      { id: 'e2e-review-1', rating: 5, text: 'E2E: best flat white', reviewer: 'Ana', created_at: '2026-11-10T10:00:00Z',
        language: 'en', reply: null, url: null, photos: [] },
    ],
    checked_at: new Date().toISOString(),
    generated_at: new Date().toISOString(),
  };
}

/** The Business Agent's latest posts (GET /api/site/1/posts): its Instagram, as it reads it. */
function agentPosts() {
  return {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee' },
    source: 'instagram',
    account: { handle: FIXTURE.agent.instagramHandle, url: `https://www.instagram.com/${FIXTURE.agent.instagramHandle}` },
    posts: FIXTURE.posts.map((post, i) => ({
      id: post.id,
      permalink: post.permalink,
      // Same-origin photography, so next/image needs no remote host for it.
      image_url: i === 2 ? '/media/ube-latte.webp' : '/media/acai-bowl.webp',
      caption: `${post.caption}\n#easybeans`,
      posted_at: `2026-10-1${i}T10:00:00Z`,
      video: i === 2,
    })),
    fetched_at: new Date().toISOString(),
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

/** What the stand-in's club is doing, set by club.spec.ts: 'open', 'closed' (no new members) or 'none' (404). */
let clubMode = 'open';

/** The Business Agent's coffee club (GET /api/site/1/club), as docs/WEBSITE.md in business-agent has it. */
function agentClub() {
  return {
    version: 1,
    business: { id: 1, name: 'Easy Beans Coffee' },
    club: { ...FIXTURE.club, taking_members: clubMode === 'open', signup_url: null },
    generated_at: new Date().toISOString(),
  };
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
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/health') return json(res, 200, { ok: true });
  const postId = /^\/instagram\/v[\d.]+\/(\d+)$/.exec(pathname)?.[1];
  if (postId) {
    const post = instagramPost(postId);
    return post ? json(res, 200, post) : json(res, 400, { error: { code: 100 } });
  }
  if (pathname.startsWith('/instagram/')) return json(res, 200, instagram());
  if (pathname === '/agent/api/site/1/details') return json(res, 200, agentDetails());
  if (pathname === '/agent/api/site/1/reviews') return json(res, 200, agentReviews());
  if (pathname === '/agent/api/site/1/posts') return json(res, 200, agentPosts());
  if (pathname === '/agent/api/site/1/club') {
    return clubMode === 'none' ? json(res, 404, { error: 'Not found' }) : json(res, 200, agentClub());
  }
  if (pathname === '/control/club' && req.method === 'POST') {
    clubMode = searchParams.get('mode') ?? 'open';
    return json(res, 200, { mode: clubMode });
  }
  // Square and anything else: answer like an unconfigured service.
  return json(res, 404, { error: 'not mocked' });
}).listen(PORT, () => {
  console.log(`[mock-feeds] listening on ${PORT}`);
});
