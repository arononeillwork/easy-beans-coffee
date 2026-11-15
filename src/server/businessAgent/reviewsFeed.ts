import 'server-only';
import { cafeReviews, parseAgentReviews, type CafeReviews } from '@/features/reviews/agentReviews';
import { agentFeed } from './feed';

/**
 * The café's Google rating and reviews, as the Business Agent keeps them, for
 * the rating card on the visit section. The agent reads Google every hour and
 * the site reads the agent, so a new review is here within the hour and the site
 * needs no Google key of its own.
 *
 * The feed is public, per business, and switched on in the agent (Website & SEO
 * → Your Google reviews on your website). Its contract lives in the
 * business-agent repo, docs/WEBSITE.md. `BUSINESS_AGENT_REVIEWS_URL` names
 * another address for it, or `off`.
 */

/** Ratings move slowly, and the agent itself reads Google hourly. */
const REVALIDATE_SECONDS = 15 * 60;

const readReviews = agentFeed({
  name: 'reviews',
  path: 'reviews',
  env: 'BUSINESS_AGENT_REVIEWS_URL',
  parse: parseAgentReviews,
  revalidateSeconds: REVALIDATE_SECONDS,
});

/**
 * The café's reviews, or null when the agent has never been read (the rating
 * card then stays off the page rather than show a made-up number).
 */
export async function getCafeReviews(): Promise<CafeReviews | null> {
  const feed = await readReviews();
  return feed ? cafeReviews(feed) : null;
}
