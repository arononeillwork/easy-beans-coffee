import { defineConfig, devices } from '@playwright/test';

/**
 * Checks the deployed site, not a local build: are the automatic feeds
 * (Square prices, Google rating and hours, Instagram, ordering hours) actually
 * flowing in production right now? Read-only — nothing is ordered or written.
 *
 *   npm run test:live                       # www.easybeanscoffee.com
 *   LIVE_BASE_URL=https://<preview>.vercel.app npm run test:live
 *
 * Also runs every morning from .github/workflows/live-feeds.yml.
 */
export default defineConfig({
  testDir: './tests/live',
  timeout: 60_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.LIVE_BASE_URL ?? 'https://www.easybeanscoffee.com',
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
