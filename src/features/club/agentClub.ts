/**
 * The café's coffee club as the Business Agent sells it: what it costs a month
 * (Square charges it) and what it gives each week (the agent counts them). The
 * site reads it for the public club page and the header's "Join the club".
 *
 * The feed's contract lives in the business-agent repo, docs/WEBSITE.md → "The
 * coffee club". This module is the plain-data half, parsed and unit-tested
 * without a network call; the fetch is server/businessAgent/clubFeed.
 */

export interface ClubOffer {
  name: string;
  /** A month, in `currency`. */
  price: number;
  currency: string;
  coffees_per_week: number;
  /** The most a free coffee is worth (a dearer drink costs the difference); null when not said. */
  max_value: number | null;
  /** False: the club is shown, with no way to join. */
  taking_members: boolean;
}

/** The agent's feed (version 1), as far as the site reads it. */
export interface AgentClub {
  version: 1;
  business: { id: number; name: string };
  club: ClubOffer;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/**
 * The feed, checked: version 1 with a club that has a name, a price and its
 * coffees a week. Anything else is null, so the page never shows half an offer.
 * Joining stays shut unless the agent says it's open.
 */
export function parseAgentClub(raw: unknown): AgentClub | null {
  if (!isObject(raw) || raw.version !== 1 || !isObject(raw.business) || !isObject(raw.club)) return null;
  const { club } = raw;
  const name = text(club.name);
  const price = amount(club.price);
  const coffees = amount(club.coffees_per_week);
  const currency = (text(club.currency) ?? 'EUR').toUpperCase();
  if (!name || !price || !coffees || !Number.isInteger(coffees) || !/^[A-Z]{3}$/.test(currency)) return null;
  return {
    version: 1,
    business: { id: typeof raw.business.id === 'number' ? raw.business.id : 0, name: text(raw.business.name) ?? '' },
    club: {
      name,
      price,
      currency,
      coffees_per_week: coffees,
      max_value: amount(club.max_value),
      taking_members: club.taking_members === true,
    },
  };
}

/** "€10" or "€4.50" ("10 €", "4,50 €" in Spanish): cents only when there are some. */
export function clubMoney(value: number, currency: string, lang: 'en' | 'es'): string {
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** "1 coffee a week for €10 a month", from the dictionary's two forms of it. */
export function clubOfferLine(club: ClubOffer, copy: { offerOne: string; offerMany: string }, lang: 'en' | 'es'): string {
  return (club.coffees_per_week === 1 ? copy.offerOne : copy.offerMany)
    .replace('{n}', String(club.coffees_per_week))
    .replace('{price}', clubMoney(club.price, club.currency, lang));
}
