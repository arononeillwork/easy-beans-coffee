import 'server-only';
import { liveSiteBase } from './agent';

/**
 * Newsletter sign-ups into the Business Agent, the café's back office. Every
 * sign-up here (the subscribe popup, the newsletter section, the shop page,
 * competition entries) is sent on, so the person is on its Customers page as a
 * lead from the website with a yes to marketing, and the topics they ticked are
 * tags its campaigns can pick ("Learning English"). Unsubscribes go too, so its
 * campaigns leave them out.
 *
 * The site's own lead list (email_signups) stays the record here; this is a
 * copy that must never cost a sign-up. Nothing here throws: a Business Agent
 * that's down, slow or switched off is a log line.
 *
 * The contract lives in the business-agent repo, docs/WEBSITE.md → "Newsletter
 * sign-ups". The topic keys (src/shared/lib/interests.ts) are set up the same
 * there for Easy Beans.
 */

const TIMEOUT_MS = 4000;

/**
 * Where sign-ups go: `BUSINESS_AGENT_SITE_URL` names it (another agent, or
 * another business); `off` switches it off. Unset, the deployed site sends to
 * the live agent and a laptop or a test run sends nothing, so trying the popup
 * locally never adds anyone to the café's customers.
 */
export function agentSiteUrl(): string | null {
  const set = process.env.BUSINESS_AGENT_SITE_URL?.trim();
  if (set) return set.toLowerCase() === 'off' ? null : set.replace(/\/+$/, '');
  return process.env.VERCEL === '1' ? liveSiteBase() : null;
}

/**
 * The website key, made in the Business Agent (Website & SEO → Newsletter
 * sign-ups → Make a website key). Optional: sign-ups and unsubscribes need no
 * set-up, only the business's number in the address, so another business's
 * site is linked by `BUSINESS_AGENT_BUSINESS` alone. A server secret: with it
 * the agent doesn't hold these sign-ups to its per-address limit and says
 * whether an unsubscribed address was on its list.
 */
function agentKey(): string | null {
  return process.env.BUSINESS_AGENT_NEWSLETTER_KEY?.trim() || null;
}

export interface AgentSignup {
  email: string;
  /** Topic keys from src/shared/lib/interests.ts. */
  interests: readonly string[];
  phone?: string | null;
  name?: string | null;
  lang?: 'en' | 'es' | null;
  /** Where on the site: the form's source (`first_visit_popup`, `competition`…). */
  place: string;
  /** The visitor's address, so the agent's limit counts them and not this server. Never kept there as is. */
  ip?: string | null;
}

/** Why a send was skipped or failed, for the logs; null when it went through. */
type Outcome = 'off' | `http_${number}` | 'unreachable' | null;

async function post(path: 'signup' | 'unsubscribe', body: Record<string, unknown>, visitorIp?: string | null): Promise<Outcome> {
  const base = agentSiteUrl();
  if (!base) return 'off';
  const key = agentKey();
  try {
    const response = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        ...(visitorIp ? { 'x-visitor-ip': visitorIp } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? null : `http_${response.status}`;
  } catch {
    return 'unreachable';
  }
}

/** Never the address itself in the logs: only what happened. */
function report(what: string, outcome: Outcome) {
  if (outcome === null || outcome === 'off') return;
  console.error(`Business Agent ${what} failed`, { outcome });
}

/** Send one sign-up on. Resolves either way; never throws. */
export async function sendSignupToAgent(signup: AgentSignup): Promise<void> {
  const outcome = await post('signup', {
    email: signup.email.trim().toLowerCase(),
    interests: [...new Set(signup.interests)],
    ...(signup.phone ? { phone: signup.phone } : {}),
    ...(signup.name ? { name: signup.name } : {}),
    ...(signup.lang ? { lang: signup.lang } : {}),
    place: signup.place,
  }, signup.ip).catch(() => 'unreachable' as const);
  report('sign-up', outcome);
}

/** Someone unsubscribed (or deleted their account): no more marketing there. Never throws. */
export async function sendUnsubscribeToAgent(email: string): Promise<void> {
  const outcome = await post('unsubscribe', { email: email.trim().toLowerCase() }).catch(() => 'unreachable' as const);
  report('unsubscribe', outcome);
}
