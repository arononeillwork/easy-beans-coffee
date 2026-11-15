import 'server-only';
import { cafeDetails, fallbackDetails, parseAgentDetails, type AgentDetails, type CafeDetails } from '@/features/details/agentDetails';
import { agentFeed, agentFeedUrl } from './feed';

/**
 * The café's details — address, contacts, social accounts, opening hours and
 * the days it's closed — as the Business Agent has them, for the footer, the
 * visit section, "open now" and online ordering. Change them in the agent
 * (Business and Opening hours pages, closures on its Calendar) and the site
 * follows within a few minutes, with no deploy; Google Maps gets the same.
 *
 * The feed is public, per business, and switched on in the agent (Website &
 * SEO → Your details on your website). Its contract lives in the
 * business-agent repo, docs/WEBSITE.md.
 */

/**
 * Kept five minutes, so a change in the agent (hours, a closure) is on the
 * site, and moves the online ordering cutoff, within a few.
 */
const REVALIDATE_SECONDS = 5 * 60;

/**
 * Where the feed is read from. `BUSINESS_AGENT_DETAILS_URL` names it (another
 * agent, or another business); `off` switches it off. Unset, the deployed site
 * reads the live agent and a laptop reads nothing (it shows the built-in
 * details), so trying the site locally never depends on the agent.
 */
export const agentDetailsUrl = () => agentFeedUrl('details', 'BUSINESS_AGENT_DETAILS_URL');

const readDetails = agentFeed<AgentDetails>({
  name: 'details',
  path: 'details',
  env: 'BUSINESS_AGENT_DETAILS_URL',
  parse: parseAgentDetails,
  revalidateSeconds: REVALIDATE_SECONDS,
});

/**
 * The café's details. Never throws: an agent that's down or slow costs their
 * freshness, never the page — the last details read are served, and with none
 * the built-in ones (`source: 'fallback'`).
 */
export async function getCafeDetails(): Promise<CafeDetails> {
  const details = await readDetails();
  return details ? cafeDetails(details) : fallbackDetails();
}
