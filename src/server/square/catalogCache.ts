import 'server-only';
import type { MenuResponse } from '@/features/order/types';
import { fetchAndNormalizeCatalog } from './catalog';

/**
 * Per-instance TTL cache for the normalized catalog. Browsing tolerates
 * 5 minutes of staleness; the checkout path demands ≤60s so manipulated or
 * stale prices are caught against near-live data. On Vercel this cache is
 * per-lambda, which is acceptable for a single-café menu.
 */
const BROWSE_TTL_MS = 5 * 60 * 1000;
const CHECKOUT_TTL_MS = 60 * 1000;

/**
 * Matches the browse TTL above and /menu's `revalidate`. This is not only a
 * cache setting: an uncached fetch inside a statically generated route strips
 * that route's revalidate, so leaving it off would prerender /menu once at
 * build and never regenerate it. Checkout passes `undefined` to bypass Next's
 * data cache entirely and read near-live prices.
 */
const BROWSE_REVALIDATE_SECONDS = BROWSE_TTL_MS / 1000;

let cached: { menu: MenuResponse; fetchedAtMs: number } | null = null;
let inflight: Promise<MenuResponse> | null = null;

export async function getCatalog(options?: {
  maxAgeMs?: number;
  revalidateSeconds?: number;
}): Promise<MenuResponse> {
  const maxAge = options?.maxAgeMs ?? BROWSE_TTL_MS;
  const now = Date.now();

  if (cached && now - cached.fetchedAtMs <= maxAge) {
    return cached.menu;
  }

  if (!inflight) {
    inflight = fetchAndNormalizeCatalog({ revalidateSeconds: options?.revalidateSeconds })
      .then((menu) => {
        cached = { menu, fetchedAtMs: Date.now() };
        return menu;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return await inflight;
  } catch (err) {
    // Serve stale data on upstream failure rather than an empty menu.
    if (cached) return cached.menu;
    throw err;
  }
}

/** No revalidateSeconds: checkout reads past Next's data cache, straight to Square. */
export function getCatalogForCheckout(): Promise<MenuResponse> {
  return getCatalog({ maxAgeMs: CHECKOUT_TTL_MS });
}

/**
 * Catalog for pages that must still render when Square is unreachable or not
 * configured at all — prerendering must never fail the build. Callers fall back
 * to fetching client-side from /api/menu.
 */
export async function getCatalogOrNull(): Promise<MenuResponse | null> {
  try {
    return await getCatalog({ revalidateSeconds: BROWSE_REVALIDATE_SECONDS });
  } catch {
    return null;
  }
}

export function invalidateCatalogCache(): void {
  cached = null;
}
