import 'server-only';
import { feedUrl } from '../feedBase';
import { liveSiteBase } from './agent';

/**
 * How the site reads every feed the Business Agent keeps for it — the menu, the
 * café's details and hours, its Google reviews, its Instagram posts, and any
 * added later: `GET https://businesssagent.com/api/site/<business>/<path>`,
 * each public, per business, and switched on in the agent (Website & SEO).
 * Their contracts live in the business-agent repo, docs/WEBSITE.md.
 *
 * One reader, so each feed behaves the same way:
 *
 * - **Where:** `<env>` names another address (another agent, another business)
 *   or `off`; unset, a deployed site reads the live agent and a laptop or a test
 *   run reads nothing, so trying the site locally never depends on the agent.
 * - **How fresh:** kept `revalidateSeconds` by Next, so a change in the agent is
 *   on the site within that, with no deploy.
 * - **When it fails:** never throws. An agent that's down, slow or answering
 *   something that isn't the feed costs freshness, never the page: the last
 *   answer read is served, and with none `null` (each caller has its own
 *   built-in fallback). Said once in the logs, not on every request.
 *
 * A new feed is one call to {@link agentFeed} with its parser; nothing else here
 * changes.
 */

export interface AgentFeedSpec<T> {
  /** For the logs: "menu", "reviews"… */
  name: string;
  /** The feed's name in its address: /api/site/<business>/<path>. */
  path: string;
  /** The environment variable that names another address for it, or `off`. */
  env: string;
  /** The feed checked; null when it isn't one (the site keeps what it had). */
  parse: (raw: unknown) => T | null;
  revalidateSeconds: number;
  timeoutMs?: number;
  /**
   * For a feed whose 404 means "the café has none" (the coffee club): the last
   * answer read is dropped rather than served. Any other failure still keeps it.
   */
  noneOn404?: boolean;
}

const TIMEOUT_MS = 4000;

/** Where a feed is read from, or null when the site isn't to read it here. */
export function agentFeedUrl(path: string, env: string): string | null {
  const set = process.env[env]?.trim();
  if (set) return set.toLowerCase() === 'off' ? null : set;
  return process.env.VERCEL === '1' ? `${liveSiteBase()}/${path}` : null;
}

/** A reader for one of the agent's feeds: the feed, the last one read, or null. */
export function agentFeed<T>(spec: AgentFeedSpec<T>): () => Promise<T | null> {
  let lastGood: T | null = null;
  let reported = false;
  return async () => {
    const url = agentFeedUrl(spec.path, spec.env);
    if (!url) return null;
    try {
      const response = await fetch(feedUrl('agent', url), {
        headers: { accept: 'application/json' },
        next: { revalidate: spec.revalidateSeconds },
        signal: AbortSignal.timeout(spec.timeoutMs ?? TIMEOUT_MS),
      });
      if (response.status === 404 && spec.noneOn404) lastGood = null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = spec.parse(await response.json());
      if (!parsed) throw new Error(`not a ${spec.name} feed (version 1)`);
      lastGood = parsed;
      reported = false;
      return parsed;
    } catch (err) {
      if (!reported) {
        reported = true;
        console.warn(
          `Business Agent ${spec.name} unavailable — showing the last read, or the site's own.`,
          err instanceof Error ? err.message : err,
        );
      }
      return lastGood;
    }
  };
}
