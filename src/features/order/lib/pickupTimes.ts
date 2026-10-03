import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes } from 'date-fns';

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
 * Opening minutes-of-day per JS weekday (0 = Sunday): Mon–Fri 8–18, Sat 9–18,
 * Sun 9–16.
 *
 * Deliberately static, unlike the hours the footer shows — those are read live
 * from Google Maps. This one validates orders on the server and runs inside the
 * slot picker, so it cannot depend on a third-party call. Keep it in step with
 * the Google listing by hand; if they drift, a customer can book a slot for a
 * time the café is shut.
 */
export function openingWindow(weekday: number): { open: number; close: number } {
  if (weekday === 0) return { open: 9 * 60, close: 16 * 60 };
  if (weekday === 6) return { open: 9 * 60, close: 18 * 60 };
  return { open: 8 * 60, close: 18 * 60 };
}

export type PickupValidation = 'ok' | 'invalid' | 'past' | 'too_soon' | 'closed' | 'too_far';

export function validatePickupTime(
  atIso: string,
  nowMs: number,
  timezone: string,
  prepMinutes: number = PREP_TIME_MIN,
): PickupValidation {
  const atMs = Date.parse(atIso);
  if (Number.isNaN(atMs)) return 'invalid';

  if (atMs < nowMs) return 'past';
  if (atMs < nowMs + prepMinutes * 60_000) return 'too_soon';
  if (atMs > nowMs + MAX_ADVANCE_DAYS * 24 * 60 * 60_000) return 'too_far';

  const at = new TZDate(atMs, timezone);
  const minutes = at.getHours() * 60 + at.getMinutes();
  const { open, close } = openingWindow(at.getDay());
  if (minutes < open || minutes > close - prepMinutes) return 'closed';

  return 'ok';
}

/** True when an ASAP order can be accepted right now (with prep buffer before close). */
export function isOpenForAsap(
  nowMs: number,
  timezone: string,
  prepMinutes: number = PREP_TIME_MIN,
): boolean {
  const now = new TZDate(nowMs, timezone);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const { open, close } = openingWindow(now.getDay());
  return minutes >= open && minutes <= close - prepMinutes;
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
): PickupDay[] {
  const result: PickupDay[] = [];
  const nowTz = new TZDate(nowMs, timezone);

  for (let d = 0; d < days; d++) {
    const day = addDays(nowTz, d);
    const { open, close } = openingWindow(day.getDay());
    const dayStart = new TZDate(
      day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, timezone,
    );

    const slots: string[] = [];
    for (let m = open; m <= close - prepMinutes; m += SLOT_STEP_MIN) {
      const slot = addMinutes(dayStart, m);
      if (slot.getTime() < nowMs + prepMinutes * 60_000) continue;
      slots.push(new Date(slot.getTime()).toISOString());
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
