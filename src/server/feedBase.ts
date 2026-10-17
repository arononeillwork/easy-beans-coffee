import 'server-only';

/**
 * Test seam for the third-party feeds the site reads automatically (Google
 * Places, Instagram, TikTok, the Square catalog).
 *
 * With `E2E_FEEDS_BASE` set — and only outside a production build — every feed
 * request goes to `${E2E_FEEDS_BASE}/<service>/...` instead of the real host,
 * so the browser suite can run the whole path (API answer → what a visitor
 * sees) against a local stand-in (tests/e2e/mockFeeds.mjs). A production build
 * ignores the variable entirely, so it can never redirect live traffic.
 */
export type FeedService = 'places' | 'instagram' | 'tiktok' | 'square';

export function feedUrl(service: FeedService, realUrl: string): string {
  const base = process.env.NODE_ENV !== 'production' ? process.env.E2E_FEEDS_BASE?.trim() : undefined;
  if (!base) return realUrl;
  const { pathname, search } = new URL(realUrl);
  return `${base.replace(/\/$/, '')}/${service}${pathname}${search}`;
}
