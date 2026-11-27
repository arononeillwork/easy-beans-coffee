import 'server-only';
import { parseAgentClub, type AgentClub } from '@/features/club/agentClub';
import { agentFeed } from './feed';

/**
 * The café's coffee club, as the Business Agent sells it, for the club page and
 * the header's "Join the club" on every page. Public, with no sign-in; joining is
 * {@link import('./accounts').joinClub}. Its contract lives in the
 * business-agent repo, docs/WEBSITE.md → "The coffee club".
 * `BUSINESS_AGENT_CLUB_URL` names another address for it, or `off`.
 */

/** As long as the agent itself caches it, so closing the club to new members shows within a minute or so. */
const REVALIDATE_SECONDS = 60;

/**
 * The club, the last one read while the agent can't be asked (503, down), or
 * null: never read, or the café has none (404).
 */
export const getAgentClub: () => Promise<AgentClub | null> = agentFeed({
  name: 'club',
  path: 'club',
  env: 'BUSINESS_AGENT_CLUB_URL',
  parse: parseAgentClub,
  revalidateSeconds: REVALIDATE_SECONDS,
  noneOn404: true,
});
