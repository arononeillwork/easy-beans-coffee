import type { FullConfig } from '@playwright/test';

/**
 * Compiles every route once, serially, before any spec runs.
 *
 * `next dev` compiles routes on first request. Without this, whichever spec
 * reaches a route first absorbs that route's compile — up to ~20s for /order,
 * which pulls the Square SDK into its server graph — while competing with the
 * other worker for the same server. That reads as a flaky timeout when it is
 * really just build cost, and it lands on a different spec each run.
 *
 * Warming here makes the suite both faster and deterministic. It is purely a
 * dev-server concern: in production these routes are prerendered at build time.
 */
const ROUTES = [
  '/es',
  '/en',
  '/es/about',
  '/es/shop',
  '/en/shop',
  '/en/shop/beans',
  '/en/shop/beans/brasil-bottrel',
  '/es/order',
  '/en/order',
  '/admin',
];

async function waitForServer(baseURL: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseURL}/es`);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`dev server never became ready at ${baseURL}`);
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  const started = Date.now();

  await waitForServer(baseURL);
  for (const route of ROUTES) {
    // A failure here is not fatal: the spec that needs the route will report it
    // with far better context than this loop can.
    await fetch(`${baseURL}${route}`).catch(() => undefined);
  }

  console.log(`[globalSetup] warmed ${ROUTES.length} routes in ${Math.round((Date.now() - started) / 1000)}s`);
}
