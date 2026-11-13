import 'server-only';

/**
 * Which business on the Business Agent this site is, and where the agent is.
 * Every feed the site reads from it (the menu, the café's details) and every
 * call it makes (newsletter sign-ups, accounts) goes to
 * `https://businesssagent.com/api/site/<business>/…`.
 *
 * Easy Beans is business 1. Another business's site built from this code sets
 * `BUSINESS_AGENT_BUSINESS` to its own number (Website & SEO in the agent shows
 * it in each address), turns the feeds on there, and nothing else changes.
 */
export const AGENT_ORIGIN = 'https://businesssagent.com';

export function agentBusiness(): number {
  const n = Number(process.env.BUSINESS_AGENT_BUSINESS?.trim() || 1);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** `https://businesssagent.com/api/site/<business>`: the base of every address the site uses. */
export const liveSiteBase = () => `${AGENT_ORIGIN}/api/site/${agentBusiness()}`;
