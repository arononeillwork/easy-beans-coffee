import 'server-only';
import { cookies } from 'next/headers';
import { secretMatches } from '@/server/auth/secretMatches';

export const ADMIN_COOKIE = 'eb_leads_admin';

/**
 * The lead list holds customer email addresses, so it has its own gate, apart
 * from the task board's PIN (`server/admin/boardAuth.ts`) that staff share. One
 * secret in `ADMIN_LEADS_TOKEN`, held in an httpOnly cookie: proportionate for
 * a café with one operator, and it keeps the addresses off the open web.
 */
function configuredToken(): string | null {
  const token = process.env.ADMIN_LEADS_TOKEN?.trim();
  return token ? token : null;
}

/** No token configured means no access — fail closed, never open. */
export function isLeadsAdminConfigured(): boolean {
  return configuredToken() !== null;
}

export function matchesAdminToken(candidate: string): boolean {
  return secretMatches(candidate, configuredToken());
}

export async function isLeadsAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return typeof cookie === 'string' && matchesAdminToken(cookie);
}
