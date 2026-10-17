import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes } from 'date-fns';
import type { DayHours } from '@/shared/lib/openingHours';

/**
 * Collection scheduling rules, all evaluated in the café's timezone
 * (Europe/Madrid). Shared by the client picker and the server validator —
 * the server call is authoritative.
 */

export const PREP_TIME_MIN = 15;
/** Packaged goods are already made — nothing to prepare, so no buffer. */
export const RETAIL_PREP_TIME_MIN = 0;
export const MAX_ADVANCE_DAYS = 7;
export const SLOT_STEP_MIN = 15;

/**
 * Online orders stop this many minutes before closing, every day, whatever the
 * hours are. The café asked for it so the last web order never lands as the
 * shutters come down.
 */
export const ORDER_CUTOFF_MIN = 30;

/**
 * The week the café keeps, used only when the live Google Maps hours cannot be
 * read. Ordering normally follows Google (see `server/places/orderingHours`),
 * so changing hours on Google moves the online cutoff with it — this is the
 * safety net, kept in step with the listing (Mon–Fri 8–15, Sat 9–15, Sun shut).
 */
export const FALLBACK_HOURS: DayHours[] = [
  { day: 0, ranges: [] },
  { day: 1, ranges: [{ open: 8 * 60, close: 15 * 60 }] },
  { day: 2, ranges: [{ open: 8 * 60, close: 15 * 60 }] },
  { day: 3, ranges: [{ open: 8 * 60, close: 15 * 60 }] },
  { day: 4, ranges: [{ open: 8 * 60, close: 15 * 60 }] },
  { day: 5, ranges: [{ open: 8 * 60, close: 15 * 60 }] },
  { day: 6, ranges: [{ open: 9 * 60, close: 15 * 60 }] },
];

/** Google reports "open 24 hours" with no closing time. */
const END_OF_DAY = 24 * 60;

/**
 * The windows in which an order may be placed (ASAP) or collected (scheduled)
 * on a weekday: each opening span, ending `max(cutoff, prep)` minutes before it
 * closes. Several spans in a day (a split shift) give several windows.
 */
export function orderWindows(
  hours: DayHours[],
  weekday: number,
  prepMinutes: number = PREP_TIME_MIN,
): { open: number; last: number }[] {
  const buffer = Math.max(ORDER_CUTOFF_MIN, prepMinutes);
  const day = hours.find((entry) => entry.day === weekday);
  if (!day) return [];
  return day.ranges
    .map((range) => ({ open: range.open, last: (range.close ?? END_OF_DAY) - buffer }))
    .filter((window) => window.last >= window.open);
}

function inWindow(minutes: number, windows: { open: number; last: number }[]): boolean {
  return windows.some((window) => minutes >= window.open && minutes <= window.last);
}

export type PickupValidation = 'ok' | 'invalid' | 'past' | 'too_soon' | 'closed' | 'too_far';

export function validatePickupTime(
  atIso: string,
  nowMs: number,
  timezone: string,
  prepMinutes: number = PREP_TIME_MIN,
  hours: DayHours[] = FALLBACK_HOURS,
): PickupValidation {
  const atMs = Date.parse(atIso);
  if (Number.isNaN(atMs)) return 'invalid';

  if (atMs < nowMs) return 'past';
  if (atMs < nowMs + prepMinutes * 60_000) return 'too_soon';
  if (atMs > nowMs + MAX_ADVANCE_DAYS * 24 * 60 * 60_000) return 'too_far';

  const at = new TZDate(atMs, timezone);
  const minutes = at.getHours() * 60 + at.getMinutes();
  if (!inWindow(minutes, orderWindows(hours, at.getDay(), prepMinutes))) return 'closed';

  return 'ok';
}

/**
 * True when an ASAP order can be accepted right now: the café is open and it is
 * not yet within ORDER_CUTOFF_MIN of closing.
 */
export function isOpenForAsap(
  nowMs: number,
  timezone: string,
  prepMinutes: number = PREP_TIME_MIN,
  hours: DayHours[] = FALLBACK_HOURS,
): boolean {
  const now = new TZDate(nowMs, timezone);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return inWindow(minutes, orderWindows(hours, now.getDay(), prepMinutes));
}

/**
 * When online ordering next opens, as an ISO instant, looking up to a week
 * ahead. Null if the schedule has no open window at all.
 */
export function nextOrderingOpen(
  nowMs: number,
  timezone: string,
  prepMinutes: number = PREP_TIME_MIN,
  hours: DayHours[] = FALLBACK_HOURS,
): string | null {
  const nowTz = new TZDate(nowMs, timezone);
  for (let d = 0; d <= 7; d++) {
    const day = addDays(nowTz, d);
    const dayStart = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, timezone);
    for (const window of orderWindows(hours, day.getDay(), prepMinutes)) {
      const at = addMinutes(dayStart, window.open).getTime();
      if (at > nowMs) return new Date(at).toISOString();
    }
  }
  return null;
}

export interface PickupDay {
  /** ISO date (yyyy-mm-dd) in café time, used as the option key. */
  key: string;
  /** Slot instants as ISO strings (UTC), pre-filtered to valid times. */
  slots: string[];
}

/** Selectable slots for the next `days` days, aligned to SLOT_STEP_MIN. */
export function generatePickupDays(
  nowMs: number,
  timezone: string,
  days = 3,
  prepMinutes: number = PREP_TIME_MIN,
  hours: DayHours[] = FALLBACK_HOURS,
): PickupDay[] {
  const result: PickupDay[] = [];
  const nowTz = new TZDate(nowMs, timezone);

  for (let d = 0; d < days; d++) {
    const day = addDays(nowTz, d);
    const windows = orderWindows(hours, day.getDay(), prepMinutes);
    const dayStart = new TZDate(
      day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, timezone,
    );

    const slots: string[] = [];
    for (const window of windows) {
      for (let m = window.open; m <= window.last; m += SLOT_STEP_MIN) {
        const slot = addMinutes(dayStart, m);
        if (slot.getTime() < nowMs + prepMinutes * 60_000) continue;
        slots.push(new Date(slot.getTime()).toISOString());
      }
    }

    if (slots.length > 0) {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
        day.getDate(),
      ).padStart(2, '0')}`;
      result.push({ key, slots });
    }
  }

  return result;
}

/** Formats a slot instant as HH:mm in café time. */
export function formatSlotLabel(iso: string, timezone: string): string {
  const d = new TZDate(Date.parse(iso), timezone);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
