// Local stand-in for the third-party feeds the site reads automatically.
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

function instagram() {
  return {
    data: FIXTURE.posts.map((post, i) => ({
      id: post.id,
      caption: `${post.caption}\n#easybeans`,
      media_type: i === 2 ? 'VIDEO' : 'IMAGE',
      // Same-origin photography, so next/image needs no remote host for it.
      media_url: '/media/acai-bowl.webp',
      thumbnail_url: '/media/ube-latte.webp',
      permalink: post.permalink,
      timestamp: `2026-10-1${i}T10:00:00+0000`,
    })),
  };
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
  if (pathname.startsWith('/instagram/')) return json(res, 200, instagram());
  // TikTok, Square and anything else: answer like an unconfigured service.
  return json(res, 404, { error: 'not mocked' });
}).listen(PORT, () => {
  console.log(`[mock-feeds] listening on ${PORT}`);
});
