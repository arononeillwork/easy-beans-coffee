import type { DayHours } from '@/shared/lib/openingHours';

/**
 * The café's details as the Business Agent has them — its back office, where
 * the address, contacts, social accounts and opening hours are kept once (the
 * Business and Opening hours pages) and sent everywhere: Google Maps and this
 * site. Change them there and the site follows within minutes, no deploy.
 *
 * The feed's contract lives in the business-agent repo, docs/WEBSITE.md → "The
 * business's details and opening hours" (`SiteDetailsFeed`). This module is the
 * plain-data half: parsing it and turning it into what the pages use, so it can
 * be unit-tested without a network call. The fetch is server/businessAgent/
 * detailsFeed.
 */

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
/** JS / Google convention, as DayHours uses it: 0 = Sunday. */
const WEEKDAY: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

interface Hours { open: string; close: string }

/** The agent's feed (version 1), as far as the site reads it. */
export interface AgentDetails {
  version: 1;
  business: { id: number; name: string };
  address: string | null;
  address_lines: string[];
  maps_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_url: string | null;
  email: string | null;
  website: string | null;
  social: {
    instagram: { handle: string; url: string } | null;
    tiktok: { handle: string; url: string } | null;
  };
  timezone: string;
  hours: Record<DayKey, Hours | null>;
  closures: Array<{ from: string; to: string; reason: string }>;
  days: Array<{ date: string; day: DayKey; open: string | null; close: string | null; closed_reason: string | null }>;
  generated_at: string;
}

/** What the pages use: the agent's details, or the built-in ones when it can't be read. */
export interface CafeDetails {
  source: 'agent' | 'fallback';
  name: string;
  /** "C. Pizarro 8, 29670 San Pedro de Alcántara, Málaga", and its parts between commas. */
  address: string | null;
  addressLines: string[];
  mapsUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsappUrl: string | null;
  email: string | null;
  instagram: { handle: string; url: string } | null;
  tiktok: { handle: string; url: string } | null;
  timeZone: string;
  /** The usual week. */
  week: DayHours[];
  /** The next seven days by weekday, the days it's closed (a holiday, a closure) shut: for "open now" and ordering. */
  nextWeek: DayHours[];
  /** Days it's closed besides its week, from today. */
  closures: Array<{ from: string; to: string; reason: string }>;
}

const time = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (hhmm: string) => {
  const m = time.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const isText = (v: unknown): v is string => typeof v === 'string';
const textOrNull = (v: unknown) => (isText(v) && v.trim() ? v.trim() : null);
const isHours = (v: unknown): v is Hours =>
  !!v && typeof v === 'object' && isText((v as Hours).open) && isText((v as Hours).close) &&
  minutes((v as Hours).open) !== null && minutes((v as Hours).close) !== null;
const social = (v: unknown) => {
  const s = v as { handle?: unknown; url?: unknown } | null;
  return s && isText(s.handle) && isText(s.url) && /^https:\/\//.test(s.url) ? { handle: s.handle, url: s.url } : null;
};
const https = (v: unknown) => (isText(v) && /^https:\/\//.test(v) ? v : null);

/** The agent's answer, checked; null when it isn't a version 1 details feed. */
export function parseAgentDetails(json: unknown): AgentDetails | null {
  const d = json as Partial<AgentDetails> | null;
  if (!d || typeof d !== 'object' || d.version !== 1 || !d.business || !isText(d.business.name)) return null;
  if (!d.hours || typeof d.hours !== 'object' || !isText(d.timezone)) return null;
  const hours = Object.fromEntries(DAY_KEYS.map((k) => [k, isHours(d.hours![k]) ? d.hours![k] : null])) as Record<DayKey, Hours | null>;
  const days = (Array.isArray(d.days) ? d.days : []).filter(
    (x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) && DAY_KEYS.includes(x.day),
  );
  const closures = (Array.isArray(d.closures) ? d.closures : []).filter(
    (c) => c && /^\d{4}-\d{2}-\d{2}$/.test(String(c.from)) && /^\d{4}-\d{2}-\d{2}$/.test(String(c.to)) && isText(c.reason),
  );
  return {
    version: 1,
    business: { id: Number(d.business.id), name: d.business.name },
    address: textOrNull(d.address),
    address_lines: (Array.isArray(d.address_lines) ? d.address_lines : []).filter(isText),
    maps_url: https(d.maps_url),
    phone: textOrNull(d.phone),
    whatsapp: textOrNull(d.whatsapp),
    whatsapp_url: https(d.whatsapp_url),
    email: textOrNull(d.email),
    website: https(d.website),
    social: { instagram: social(d.social?.instagram), tiktok: social(d.social?.tiktok) },
    timezone: d.timezone,
    hours,
    closures,
    days,
    generated_at: isText(d.generated_at) ? d.generated_at : '',
  };
}

const range = (open: string | null, close: string | null) => {
  const o = open ? minutes(open) : null;
  const c = close ? minutes(close) : null;
  return o !== null && c !== null ? [{ open: o, close: c }] : [];
};

/** The usual week as DayHours, Sunday first. */
export function weekOf(details: Pick<AgentDetails, 'hours'>): DayHours[] {
  return [...DAY_KEYS]
    .sort((a, b) => WEEKDAY[a] - WEEKDAY[b])
    .map((k) => ({ day: WEEKDAY[k], ranges: range(details.hours[k]?.open ?? null, details.hours[k]?.close ?? null) }));
}

/**
 * The next seven days by weekday, with the days the café is closed shut, like
 * Google's "current" hours: since it spans exactly a week, indexing by weekday
 * is unambiguous. Days the feed doesn't cover follow the usual week.
 */
export function nextWeekOf(details: Pick<AgentDetails, 'hours' | 'days'>): DayHours[] {
  const week = weekOf(details);
  for (const d of details.days.slice(0, 7)) {
    const entry = week.find((w) => w.day === WEEKDAY[d.day]);
    if (entry) entry.ranges = range(d.open, d.close);
  }
  return week;
}

/** The pages' view of the agent's details. */
export function cafeDetails(details: AgentDetails): CafeDetails {
  return {
    source: 'agent',
    name: details.business.name,
    address: details.address,
    addressLines: details.address_lines,
    mapsUrl: details.maps_url,
    phone: details.phone,
    whatsapp: details.whatsapp,
    whatsappUrl: details.whatsapp_url,
    email: details.email,
    instagram: details.social.instagram,
    tiktok: details.social.tiktok,
    timeZone: details.timezone,
    week: weekOf(details),
    nextWeek: nextWeekOf(details),
    closures: details.closures,
  };
}

/**
 * Only when the agent can't be read and never has been since the server
 * started (a laptop, a test run, the agent down at boot): what the site showed
 * before it read the agent. Not a second place to change things — change them
 * in the agent.
 */
export const FALLBACK_DETAILS: AgentDetails = {
  version: 1,
  business: { id: 1, name: 'Easy Beans Coffee' },
  // The contacts as the agent had them when this was written (2026-11-13).
  address: 'C. Pizarro, 8, 29670 San Pedro de Alcántara, Málaga',
  address_lines: ['C. Pizarro, 8', '29670 San Pedro de Alcántara', 'Málaga'],
  maps_url: 'https://maps.google.com/maps?cid=9564056643340584302',
  phone: '+34 695 415 335',
  whatsapp: '+34 695 415 335',
  whatsapp_url: 'https://wa.me/34695415335',
  email: 'easybeanscafe@gmail.com',
  website: 'https://www.easybeanscoffee.com/',
  social: {
    instagram: { handle: 'easy.beans.coffee', url: 'https://www.instagram.com/easy.beans.coffee' },
    tiktok: { handle: 'easybeanscoffee', url: 'https://www.tiktok.com/@easybeanscoffee' },
  },
  timezone: 'Europe/Madrid',
  // The same week as the cart's built-in one (FALLBACK_HOURS in features/order/lib/pickupTimes).
  hours: {
    mon: { open: '08:00', close: '15:00' }, tue: { open: '08:00', close: '15:00' }, wed: { open: '08:00', close: '15:00' },
    thu: { open: '08:00', close: '15:00' }, fri: { open: '08:00', close: '15:00' }, sat: { open: '09:00', close: '15:00' }, sun: null,
  },
  closures: [],
  days: [],
  generated_at: '',
};

export const fallbackDetails = (): CafeDetails => ({ ...cafeDetails(FALLBACK_DETAILS), source: 'fallback' });
