import 'server-only';
import { parseAgentMenu, type AgentMenu } from '@/features/menu/agentMenu';
import { agentFeed, agentFeedUrl } from './feed';

/**
 * The menu as the Business Agent has it — the café's back office, where the
 * menu is kept once and sent everywhere: Google Maps, the screens, the printed
 * menus, and this site. The agent decides what is listed; see
 * features/menu/agentMenu for what that changes here.
 *
 * The feed is public, per business, and switched on in the agent (Website & SEO
 * → The menu on your website). Its contract lives in the business-agent repo,
 * docs/WEBSITE.md.
 */


/**
 * Kept five minutes, so a change in the agent is on the site within a few.
 * It also sets how often the pages that read it regenerate (an uncached fetch
 * would make them dynamic; see the same note in square/priceCache).
 */
const REVALIDATE_SECONDS = 5 * 60;

/**
 * Where the feed is read from. `BUSINESS_AGENT_MENU_URL` names it (another
 * agent, or another business); `off` switches it off. Unset, the deployed site
 * reads the live agent and a laptop or a test run reads nothing, so the e2e
 * suite never depends on the real menu.
 */
export const agentMenuUrl = () => agentFeedUrl('menu', 'BUSINESS_AGENT_MENU_URL');

/**
 * The agent's menu, or null when there is none to follow (not configured, or
 * never reached). An unreachable agent costs the freshness of the listing,
 * never the board: the last good menu is served, and with none the site lists
 * what it shipped with.
 */
export const getAgentMenu: () => Promise<AgentMenu | null> = agentFeed({
  name: 'menu',
  path: 'menu',
  env: 'BUSINESS_AGENT_MENU_URL',
  parse: parseAgentMenu,
  revalidateSeconds: REVALIDATE_SECONDS,
});
