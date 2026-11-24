import 'server-only';
import type { AccountClub } from '@/features/account/types';
import { agentKey, agentSiteUrl } from './newsletter';

/**
 * The signed-in person's coffee club from the Business Agent: their pass (this
 * week's coffee and their member code, for the barcode) or how to join. The
 * contract lives in the business-agent repo, docs/WEBSITE.md → "Accounts &
 * rewards" → "The coffee club".
 *
 * Server to server only, with the website key (the newsletter's), and the email
 * only ever in the body. The site's sign-in has checked the address already
 * (Supabase lets a session start only once it's confirmed), so it says so with
 * `email_verified: true`. The account page must never fail because the agent
 * is down: anything but a clear answer is no club card, and nothing here throws.
 */

const TIMEOUT_MS = 4000;

type Outcome = 'off' | 'no_key' | `http_${number}` | 'unreachable';
type Result<T> = { ok: true; body: T } | { ok: false; outcome: Outcome };

async function post<T>(path: 'account/summary' | 'account/sync', body: Record<string, unknown>): Promise<Result<T>> {
  const base = agentSiteUrl();
  if (!base) return { ok: false, outcome: 'off' };
  const key = agentKey();
  if (!key) return { ok: false, outcome: 'no_key' };
  try {
    const response = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, outcome: `http_${response.status}` };
    return { ok: true, body: (await response.json()) as T };
  } catch {
    return { ok: false, outcome: 'unreachable' };
  }
}

/** What happened, never who: no address in the logs. "off" (a laptop, a test run) says nothing. */
function report(outcome: Outcome) {
  if (outcome === 'off') return;
  // 404: the café hasn't turned on accounts on its website in the agent (Website & SEO).
  if (outcome === 'no_key' || outcome === 'http_404') console.warn('Business Agent coffee club unavailable', { outcome });
  else console.error('Business Agent coffee club read failed', { outcome });
}

interface Summary {
  customer: { id: string } | null;
  club?: AccountClub;
}

export interface ClubPerson {
  email: string;
  squareCustomerId: string | null;
  name?: string | null;
}

/**
 * Their club, or null: no club at the café, the agent off or unreachable. Someone
 * the agent doesn't know yet is added to its customers first (sync, with their
 * Square customer when the site knows it), as on their first sign-in.
 */
export async function clubFor(person: ClubPerson): Promise<AccountClub | null> {
  const who = { email: person.email.trim().toLowerCase(), email_verified: true };
  let summary = await post<Summary>('account/summary', who);
  if (summary.ok && !summary.body.customer) {
    const synced = await post('account/sync', {
      ...who,
      ...(person.name?.trim() ? { name: person.name.trim() } : {}),
      ...(person.squareCustomerId ? { square_customer_id: person.squareCustomerId } : {}),
    });
    if (!synced.ok) {
      report(synced.outcome);
      return null;
    }
    summary = await post<Summary>('account/summary', who);
  }
  if (!summary.ok) {
    report(summary.outcome);
    return null;
  }
  return summary.body.club ?? null;
}
