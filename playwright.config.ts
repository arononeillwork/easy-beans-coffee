import { defineConfig, devices } from '@playwright/test';
import { E2E_BOARD_PIN } from './tests/e2e/builders/boardPin';

/**
 * The port the suite runs against. Default 3000 keeps the everyday flow
 * (reusing your running dev server) — but that reuse is also a trap: a dev
 * server started with real Square credentials serves real prices, and the
 * menu/shop specs then fail on live data instead of their fixtures. When one
 * is running, isolate the suite instead of killing your server:
 *
 *   PW_PORT=3210 npx playwright test
 *
 * which starts a private dev server on 3210 with the stubbed env below.
 */
const PORT = Number(process.env.PW_PORT ?? 3000);

export default defineConfig({
  testDir: './tests/e2e',
  // globalSetup compiles every route before the specs run, so no test should
  // absorb a cold compile. This is headroom for the odd slow one, not the
  // mechanism — see tests/e2e/globalSetup.ts.
  timeout: 60_000,
  globalSetup: './tests/e2e/globalSetup.ts',
  fullyParallel: true,
  // The shared next dev server compiles routes on demand; more workers
  // than this makes first-load timeouts flaky.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // A cold start against a purged .next takes noticeably longer than the
    // 120s default left room for on Windows.
    timeout: 180_000,
    // Stand-in Supabase config so /admin builds its client and issues requests
    // the specs can intercept. Next won't override vars already in the
    // environment, so these win over .env.local and no spec can reach the real
    // table. Every REST call is mocked in tests/e2e/builders/pages.ts anyway.
    env: {
      // Its own build folder, so these stand-ins can never overwrite the bundle
      // a running `npm run dev` is serving from `.next`.
      NEXT_DIST_DIR: '.next-e2e',
      NEXT_PUBLIC_SUPABASE_URL: 'https://e2e.supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
      // The board has its own project (BusinessAgent); stub that pair too, or
      // the real one in .env.local would win for /admin.
      NEXT_PUBLIC_BOARD_SUPABASE_URL: 'https://e2e.supabase.test',
      NEXT_PUBLIC_BOARD_SUPABASE_ANON_KEY: 'e2e-anon-key',
      // A known PIN, so the gate is exercised rather than skipped (unset is
      // open in dev) and a real one in .env.local can't lock the specs out.
      ADMIN_BOARD_PIN: E2E_BOARD_PIN,
      // Square is deliberately left unconfigured so no spec can reach the real
      // catalog. /menu then renders its client fallback instead of prerendering
      // server-side, which is what lets each spec mock /api/menu with its own
      // fixture. Production, where Square is configured, renders it on the
      // server — that path is covered by the build's route table (● /[lang]/menu).
      SQUARE_ENVIRONMENT: 'sandbox',
      SQUARE_ACCESS_TOKEN: '',
      SQUARE_LOCATION_ID: '',
    },
  },
});
