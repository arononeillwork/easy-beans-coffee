import 'server-only';
import { cookies } from 'next/headers';
import { secretMatches } from '@/server/auth/secretMatches';

export const BOARD_COOKIE = 'eb_board';

/**
 * The /admin task board's gate: one PIN in `ADMIN_BOARD_PIN`, shared with the
 * people who work the board and kept in an httpOnly cookie once entered. Same
 * shape as the leads gate (`server/leads/adminAuth.ts`), with its own secret so
 * staff who use the board never get into the customer list.
 *
 * It keeps the page from strangers. The board still talks to its database from
 * the browser with a public key, so it is not a wall against someone who digs
 * that key out of the site's scripts — don't keep private notes on it.
 *
 * Unset fails closed in production; in development the board stays open, so it
 * works on a laptop with no setup.
 */
function configuredPin(): string | null {
  const pin = process.env.ADMIN_BOARD_PIN?.trim();
  return pin ? pin : null;
}

export function isBoardPinConfigured(): boolean {
  return configuredPin() !== null;
}

export function matchesBoardPin(candidate: string): boolean {
  return secretMatches(candidate, configuredPin());
}

export async function hasBoardAccess(): Promise<boolean> {
  if (!isBoardPinConfigured()) return process.env.NODE_ENV !== 'production';
  const cookie = (await cookies()).get(BOARD_COOKIE)?.value;
  return typeof cookie === 'string' && matchesBoardPin(cookie);
}
