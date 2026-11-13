import 'server-only';
import { agentKey, agentSiteUrl } from './newsletter';

/**
 * Accounts & rewards from the Business Agent, the café's back office. Someone
 * signed in here is a customer there, and their account page reads what they
 * have from it rather than from Square or a copy kept here: their beans (Square
 * Loyalty, read by the agent), their credit and how posts earn cashback (the
 * agent's reps ledger), and their code if they're a rep. Deleting the account
 * here erases them there.
 *
 * Server only, with the website key (the newsletter's). The email goes in the
 * body, never in the URL or the logs. Everything fails closed: switched off,
 * no key, an error, a 404 or more than 4 seconds is `null`, and the rewards
 * card is simply not shown. Nothing here throws.
 *
 * The contract lives in the business-agent repo, docs/WEBSITE.md → "Accounts
 * & rewards"; the types below mirror its shared/siteAccount.ts.
 */

const TIMEOUT_MS = 4000;

export interface AgentPoints {
  program: { one: string; other: string; tiers: Array<{ id: string; name: string; points: number }> };
  balance: number;
  lifetime: number;
}

export interface AgentCreditLine {
  /** `YYYY-MM-DD`. */
  date: string;
  label: string;
  /** Earned (+); spent, paid out or taken back (−). */
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
}

export interface AgentCredit {
  balance: number;
  pending: number;
  gift_card_linked: boolean;
  lines: AgentCreditLine[];
}

export interface AgentCashback {
  on: true;
  per_1000_views: number;
  per_100_likes: number;
  per_follower: number;
  max: number;
}

export interface AgentRep {
  code: string;
  kind: 'team' | 'ambassador' | 'customer';
  earns: 'credit' | 'commission';
  reach: number;
  reach_step: string;
  reach_step_id?: string;
  multiplier: number;
  crew: { leads: boolean; members: number };
  this_month: number;
}

export interface AgentSummary {
  customer: { id: string; first_name: string | null } | null;
  points?: AgentPoints | null;
  credit?: AgentCredit | null;
  cashback?: AgentCashback | null;
  rep?: AgentRep | null;
}

export interface AgentSync {
  customer_id: string;
  created: boolean;
  is_rep: boolean;
  ignored?: string[];
}

export interface AgentErase {
  erased: true;
  kept: 'ledger' | null;
  found?: boolean;
}

/** Why a call came to nothing, for the logs; never who it was for. */
type Outcome = 'off' | 'no_key' | `http_${number}` | 'unreachable' | 'bad_answer';

async function call<T>(action: 'sync' | 'summary' | 'erase', body: Record<string, unknown>): Promise<T | Outcome> {
  const base = agentSiteUrl();
  if (!base) return 'off';
  const key = agentKey();
  if (!key) return 'no_key';
  try {
    const response = await fetch(`${base}/account/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return `http_${response.status}`;
    const json = (await response.json().catch(() => null)) as T | null;
    return json && typeof json === 'object' ? json : 'bad_answer';
  } catch {
    return 'unreachable';
  }
}

const outcomeOf = (r: unknown): Outcome | null => (typeof r === 'string' ? (r as Outcome) : null);

/** Only what happened goes to the logs: a 404 is the café having accounts off, not a fault. */
function report(action: string, outcome: Outcome) {
  if (outcome === 'off' || outcome === 'http_404') return;
  if (outcome === 'no_key') {
    console.warn(`Business Agent account ${action} skipped: BUSINESS_AGENT_NEWSLETTER_KEY is not set.`);
    return;
  }
  console.error(`Business Agent account ${action} failed`, { outcome });
}

const verified = (email: string) => ({ email: email.trim().toLowerCase(), email_verified: true });

export interface AccountSyncInput {
  /** The signed-in, verified email. */
  email: string;
  name?: string | null;
  phone?: string | null;
  squareCustomerId?: string | null;
  lang?: 'en' | 'es' | null;
  repCode?: string | null;
}

/**
 * Make sure they're a customer in the agent (first sign-in, and after each
 * profile edit; it only fills what the café hasn't got). Null when it couldn't.
 */
export async function syncAccountToAgent(input: AccountSyncInput): Promise<AgentSync | null> {
  const result = await call<AgentSync>('sync', {
    ...verified(input.email),
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.squareCustomerId ? { square_customer_id: input.squareCustomerId } : {}),
    ...(input.lang ? { lang: input.lang } : {}),
    ...(input.repCode?.trim() ? { rep_code: input.repCode.trim() } : {}),
  });
  const outcome = outcomeOf(result);
  if (outcome) {
    report('sync', outcome);
    return null;
  }
  return result as AgentSync;
}

/** What their account page shows; null hides the rewards card (off, failing or slow). */
export async function readAccountSummary(email: string): Promise<AgentSummary | null> {
  const result = await call<AgentSummary>('summary', verified(email));
  const outcome = outcomeOf(result);
  if (outcome) {
    report('summary', outcome);
    return null;
  }
  const summary = result as AgentSummary;
  return 'customer' in summary ? summary : null;
}

/**
 * Erase them in the agent (the account deleted here). Null when it couldn't:
 * the caller then at least takes back their yes to marketing.
 */
export async function eraseAccountInAgent(email: string): Promise<AgentErase | null> {
  const result = await call<AgentErase>('erase', verified(email));
  const outcome = outcomeOf(result);
  if (outcome) {
    report('erase', outcome);
    return null;
  }
  return result as AgentErase;
}
