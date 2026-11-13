import 'server-only';
import type { DayHours } from '@/shared/lib/openingHours';
import { getCafeDetails } from '../businessAgent/detailsFeed';

/**
 * The week online ordering follows: the café's hours as the Business Agent has
 * them (its Opening hours page), with the days it's closed — a closure on its
 * Calendar, a public holiday it shuts on — closed online too. Changing hours or
 * adding a closure there moves the online cutoff within minutes, no deploy;
 * Google Maps gets the same hours from the agent.
 *
 * It's the next seven days by weekday (like Google's "current" hours), so a
 * closure this week shuts that weekday only until it's past.
 *
 * Never throws. An agent that can't be read gives the last week read, and
 * with none the built-in week, so ordering keeps working on known-good hours.
 */
export async function getOrderingHours(): Promise<{ hours: DayHours[]; source: 'agent' | 'fallback' }> {
  const details = await getCafeDetails();
  return { hours: details.nextWeek, source: details.source };
}
