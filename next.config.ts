import path from 'node:path';
import type { NextConfig } from 'next';

// common-lib is a vendored submodule consumed via a bundler alias; its types
// are declared in src/types/common-lib.d.ts so the source is never
// type-checked (see tsconfig paths, which intentionally omit it).
const commonLibDir = path.resolve(__dirname, 'common-lib');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Playwright's dev server builds into its own folder (see playwright.config.ts).
  // NEXT_PUBLIC_* values are baked into the client bundle, so sharing `.next`
  // let the test server's stand-in Supabase address leak into a running
  // `npm run dev` and blank the real /admin board.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    // Webpack's resolve.alias matches by prefix, so one entry covers every
    // subpath. Turbopack matches exactly, so the `/*` form is required or
    // `@common-lib/integrations/...` fails to resolve in dev while `next build`
    // (still webpack) succeeds — a split that is easy to miss.
    resolveAlias: {
      '@common-lib': './common-lib',
      '@common-lib/*': './common-lib/*',
    },
  },
  webpack: (config) => {
    config.resolve.alias['@common-lib'] = commonLibDir;
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Brand photography never changes under the same filename, so there is no
    // reason to revalidate optimized variants on the 60s default. 31 days.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // Square-hosted catalog images
      { protocol: 'https', hostname: '**.squarecdn.com' },
      { protocol: 'https', hostname: 'items-images-production.s3.us-west-2.amazonaws.com' },
      { protocol: 'https', hostname: 'items-images-sandbox.s3.us-west-2.amazonaws.com' },
      // Social feed thumbnails. Both networks hand out signed, expiring URLs,
      // which is why the feed itself revalidates hourly — the optimizer only
      // ever fetches a URL that was refreshed within the hour.
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.tiktokcdn.com' },
      { protocol: 'https', hostname: '**.tiktokcdn-us.com' },
      // Google Places photos, resolved server-side to their storage host.
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  /**
   * Locale now lives in the path. These keep the pre-locale URLs (and anything
   * already linked or bookmarked) working by sending them to the Spanish tree,
   * which is the site's default. Temporary (307) rather than permanent so the
   * mapping can still change without poisoning browser caches.
   */
  async redirects() {
    return [
      { source: '/', destination: '/es', permanent: false },
      // The menu and the ordering page are one page now, at /order. Everything
      // that ever pointed at /menu — print, Instagram bio, bookmarks — lands on
      // it. The /order subroutes (confirmation, status) are untouched: these
      // sources match the exact path only.
      { source: '/menu', destination: '/es/order', permanent: false },
      { source: '/:lang(es|en)/menu', destination: '/:lang/order', permanent: false },
      // The page is "About us" now; the old slug keeps working for anything
      // already linked or printed.
      { source: '/our-story', destination: '/es/about', permanent: false },
      { source: '/:lang(es|en)/our-story', destination: '/:lang/about', permanent: false },
      { source: '/about', destination: '/es/about', permanent: false },
      { source: '/shop', destination: '/es/shop', permanent: false },
      { source: '/shop/:path*', destination: '/es/shop/:path*', permanent: false },
      { source: '/order', destination: '/es/order', permanent: false },
      { source: '/order/:path*', destination: '/es/order/:path*', permanent: false },
      { source: '/account', destination: '/es/account', permanent: false },
    ];
  },
};

export default nextConfig;
