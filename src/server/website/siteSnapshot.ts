import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Reads an existing website so the studio can redesign it: the words, the
 * structure and the pictures, without its markup. The URL is typed by the
 * owner, but it is still fetched from our server, so private and loopback
 * addresses are refused (and re-checked on every redirect).
 */

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12_000;

export interface SiteSnapshot {
  url: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  links: { text: string; href: string }[];
  images: { src: string; alt: string }[];
  /** Hex colours found in inline styles, most used first — a hint at the old palette. */
  colours: string[];
}

export class SnapshotError extends Error {}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new SnapshotError('Only http and https sites can be read.');
  if (url.username || url.password) throw new SnapshotError('Links with a username or password are not allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new SnapshotError(`Couldn't find ${host}. Check the address.`);
  if (addresses.some(isPrivateAddress)) throw new SnapshotError('That address points at a private network.');
}

export function normaliseSiteUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    // Any explicit scheme is kept so a non-web one is refused, not rewritten.
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'EasyBeansWebsiteStudio/1.0 (+site redesign preview)', accept: 'text/html' },
      cache: 'no-store',
    }).catch((err: unknown) => {
      throw new SnapshotError(`Couldn't reach ${url.hostname}: ${err instanceof Error ? err.message : 'network error'}`);
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new SnapshotError(`${url.hostname} answered HTTP ${response.status}.`);
    if (!(response.headers.get('content-type') ?? '').includes('html')) throw new SnapshotError('That address is not a web page.');

    const reader = response.body?.getReader();
    if (!reader) throw new SnapshotError('The page was empty.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => {});
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url };
  }
  throw new SnapshotError('Too many redirects.');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text: string): string {
  return text
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

const stripTags = (html: string) => decode(html.replace(/<[^>]+>/g, ' '));

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decode(match?.[2] ?? match?.[3] ?? match?.[4] ?? '');
}

function unique<T>(items: T[], key: (item: T) => string, limit: number): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, limit);
}

/** Pure, so it is unit-tested without the network. */
export function extractSnapshot(rawHtml: string, base: URL): SiteSnapshot {
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|noscript|svg|template)[\s\S]*?<\/\1>/gi, '');
  const styles = [...html.matchAll(/<style[\s\S]*?<\/style>|style\s*=\s*"[^"]*"/gi)].map((m) => m[0]).join(' ');
  const body = html.replace(/<style[\s\S]*?<\/style>/gi, '');

  const absolute = (href: string) => {
    try {
      return new URL(href, base).toString();
    } catch {
      return '';
    }
  };

  const metaDescription = [...body.matchAll(/<meta\b[^>]*>/gi)]
    .map((m) => m[0])
    .find((tag) => /name\s*=\s*["']?description/i.test(tag) || /property\s*=\s*["']?og:description/i.test(tag));

  const colourCounts = new Map<string, number>();
  for (const [hex] of styles.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
    const key = hex.toLowerCase();
    colourCounts.set(key, (colourCounts.get(key) ?? 0) + 1);
  }

  return {
    url: base.toString(),
    title: stripTags(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: metaDescription ? attr(metaDescription, 'content') : '',
    headings: unique([...body.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map((m) => stripTags(m[1])), (h) => h, 40),
    paragraphs: unique(
      [...body.matchAll(/<(p|li|blockquote|address)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => stripTags(m[2])).filter((t) => t.length > 2),
      (p) => p,
      120,
    ),
    links: unique(
      [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({ text: stripTags(m[2]), href: absolute(attr(m[1], 'href')) })),
      (l) => (l.text ? `${l.text}|${l.href}` : ''),
      60,
    ),
    images: unique(
      [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: absolute(attr(m[0], 'src')), alt: attr(m[0], 'alt') })),
      (i) => (i.src.startsWith('http') ? i.src : ''),
      24,
    ),
    colours: [...colourCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex),
  };
}

export async function snapshotSite(input: string): Promise<SiteSnapshot> {
  const url = normaliseSiteUrl(input);
  if (!url) throw new SnapshotError('That does not look like a web address.');
  const { html, finalUrl } = await fetchHtml(url);
  const snapshot = extractSnapshot(html, finalUrl);
  if (!snapshot.title && !snapshot.headings.length && !snapshot.paragraphs.length) {
    throw new SnapshotError('The page had no readable content (it may be built entirely in JavaScript).');
  }
  return snapshot;
}
