import 'server-only';

/**
 * Best-effort client IP for rate limiting. Vercel puts the client first in
 * x-forwarded-for; the rest of the list is proxies. Null when nothing usable
 * arrived — callers must fail open, an unknown IP is not a reason to block.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || null;
}
