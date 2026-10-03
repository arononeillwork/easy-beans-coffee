import 'server-only';
import type { Square } from 'square';
import { getSquareEnv } from '../env';

/**
 * Catalog reads over plain HTTP rather than the Square SDK.
 *
 * The SDK is 11 MB across ~8,700 files and costs ~5s just to `require`. /menu
 * is prerendered from this call, so pulling the whole SDK into that page's
 * server graph made it the slowest route in the app to compile by a factor of
 * ten. Listing the catalog is one paginated GET, so it is done directly here;
 * checkout still uses the SDK (see ./client), where the cost is paid once on a
 * route that is hit far less and never prerendered.
 *
 * The wire format is the only difference that matters: REST returns snake_case
 * where the SDK hands back camelCase, so responses are converted below and
 * `normalizeCatalog` stays untouched.
 */

/** Pinned to the version the SDK sends, so responses cannot drift apart. */
const SQUARE_VERSION = '2025-10-16';

const BASE_URL = {
  production: 'https://connect.squareup.com',
  sandbox: 'https://connect.squareupsandbox.com',
} as const;

const TYPES = 'ITEM,CATEGORY,MODIFIER_LIST,IMAGE';

/**
 * Objects whose *own keys* are merchant data rather than API field names.
 *
 * Square keys custom attributes as `<application_id>:<key>`, e.g.
 * `ABC123:ebc_badge`. Camelizing those would rename them to `ebcBadge` and
 * silently break the badge and compare-at lookups in ./catalog, so the keys of
 * this map are preserved verbatim while their values are still converted.
 */
const OPAQUE_KEY_MAPS = new Set(['custom_attribute_values']);

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/** Exported for the unit tests; not part of the module's intended API. */
export function camelizeKeys(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) return value.map((entry) => camelizeKeys(entry));
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const nextKey = parentKey !== undefined && OPAQUE_KEY_MAPS.has(parentKey) ? key : toCamel(key);
    out[nextKey] = camelizeKeys(inner, key);
  }
  return out;
}

interface ListResponse {
  objects?: Square.CatalogObject[];
  cursor?: string;
}

export interface ListOptions {
  /**
   * Seconds to keep the response in Next's data cache.
   *
   * This is load-bearing for prerendering, not just an optimization: an
   * uncached fetch inside a statically generated route strips that route's
   * `revalidate`, so /menu would prerender once at build and then never
   * regenerate — prices frozen forever, with no error to notice. Browse passes
   * a value; checkout omits it deliberately (see below).
   */
  revalidateSeconds?: number;
}

/**
 * Every catalog object of the types the menu needs, following Square's cursor
 * pagination to the end. Throws on a non-2xx so callers can fall back — see
 * getCatalogOrNull.
 */
export async function listCatalogObjects(
  options: ListOptions = {},
): Promise<Square.CatalogObject[]> {
  const env = getSquareEnv();
  const base = env.environment === 'production' ? BASE_URL.production : BASE_URL.sandbox;

  const objects: Square.CatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${base}/v2/catalog/list`);
    url.searchParams.set('types', TYPES);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
        'Square-Version': SQUARE_VERSION,
      },
      // Checkout validates prices against near-live data and must never be
      // served a cached catalog, so it omits revalidateSeconds. Its route is
      // force-dynamic, so there is no prerender to strip.
      ...(options.revalidateSeconds === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate: options.revalidateSeconds } }),
    });

    if (!res.ok) {
      throw new Error(`Square catalog list responded ${res.status}`);
    }

    const body = camelizeKeys(await res.json()) as ListResponse;
    objects.push(...(body.objects ?? []));
    cursor = body.cursor;
  } while (cursor);

  return objects;
}
