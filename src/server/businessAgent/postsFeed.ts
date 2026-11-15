import 'server-only';
import { parseAgentPosts, type AgentPosts } from '@/features/social/agentPosts';
import { agentFeed } from './feed';

/**
 * The café's latest Instagram posts, as the Business Agent reads them, for the
 * post grid on the home page. The agent asks Instagram at most every fifteen
 * minutes and keeps its token renewed; the site needs none.
 *
 * The feed is public, per business, and switched on in the agent (Website & SEO
 * → Your Instagram posts on your website). Its contract lives in the
 * business-agent repo, docs/WEBSITE.md. `BUSINESS_AGENT_POSTS_URL` names
 * another address for it, or `off`.
 */

/**
 * Fifteen minutes, matching the agent's own read: a new post is on the grid
 * within half an hour, and the signed picture addresses Instagram hands out
 * (good for days) are always fresh.
 */
const REVALIDATE_SECONDS = 15 * 60;

/** The agent's posts, the last read, or null when it has never been read. */
export const getAgentPosts: () => Promise<AgentPosts | null> = agentFeed({
  name: 'posts',
  path: 'posts',
  env: 'BUSINESS_AGENT_POSTS_URL',
  parse: parseAgentPosts,
  revalidateSeconds: REVALIDATE_SECONDS,
});
