import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time check of a typed secret (an admin token, the board PIN)
 * against the configured one. No secret configured never matches — the gates
 * built on this fail closed.
 */
export function secretMatches(candidate: string, expected: string | null): boolean {
  if (!expected) return false;

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
