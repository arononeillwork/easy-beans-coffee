import 'server-only';
import { parseAgentMenu, type AgentMenu } from '@/features/menu/agentMenu';

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

/** Easy Beans is business 1 on the live agent. */
const LIVE_FEED = 'https://businesssagent.com/api/site/1/menu';

/**
 * Kept five minutes, so a change in the agent is on the site within a few.
 * It also sets how often the pages that read it regenerate (an uncached fetch
 * would make them dynamic; see the same note in square/priceCache).
 */
const REVALIDATE_SECONDS = 5 * 60;
const TIMEOUT_MS = 4000;

/**
 * Where the feed is read from. `BUSINESS_AGENT_MENU_URL` names it (another
 * agent, or another business); `off` switches it off. Unset, the deployed site
 * reads the live agent and a laptop or a test run reads nothing, so the e2e
 * suite never depends on the real menu.
 */
export function agentMenuUrl(): string | null {
  const set = process.env.BUSINESS_AGENT_MENU_URL?.trim();
  if (set) return set.toLowerCase() === 'off' ? null : set;
  return process.env.VERCEL === '1' ? LIVE_FEED : null;
}

let lastGood: AgentMenu | null = null;
let reported = false;

/**
 * The agent's menu, or null when there is none to follow (not configured, or
 * never reached). An unreachable agent costs the freshness of the listing,
 * never the board: the last good menu is served, and with none the site lists
 * what it shipped with.
 */
export async function getAgentMenu(): Promise<AgentMenu | null> {
  const url = agentMenuUrl();
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const menu = parseAgentMenu(await response.json());
    if (!menu) throw new Error('not a menu feed (version 1)');
    lastGood = menu;
    reported = false;
    return menu;
  } catch (err) {
    if (!reported) {
      reported = true;
      console.warn(
        'Business Agent menu unavailable — listing from the last menu read, or the built-in one.',
        err instanceof Error ? err.message : err,
      );
    }
    return lastGood;
  }
}
