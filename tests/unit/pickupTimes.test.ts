import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_HOURS,
  isOpenForAsap,
  nextOrderingOpen,
  validatePickupTime,
} from '@/features/order/lib/pickupTimes';
import type { DayHours } from '@/shared/lib/openingHours';

/**
 * Online orders close ORDER_CUTOFF_MIN (30) before the café does, following
 * whatever hours are in force. October 2026 is CEST (UTC+2), so Madrid local
 * time = UTC + 2h in these instants.
 */
const TZ = 'Europe/Madrid';
const madrid = (iso: string) => Date.parse(`${iso}+02:00`);

// Wednesday 21 Oct 2026; Saturday 24; Sunday 25 (still CEST until 25 Oct 03:00).
test('weekday: open from 8:00 until 14:30, closed from 14:31', () => {
  assert.equal(isOpenForAsap(madrid('2026-10-21T07:59:00'), TZ), false);
  assert.equal(isOpenForAsap(madrid('2026-10-21T08:00:00'), TZ), true);
  assert.equal(isOpenForAsap(madrid('2026-10-21T14:30:00'), TZ), true);
  assert.equal(isOpenForAsap(madrid('2026-10-21T14:31:00'), TZ), false);
  assert.equal(isOpenForAsap(madrid('2026-10-21T17:00:00'), TZ), false);
});

test('Saturday opens at 9:00; Sunday takes no orders', () => {
  assert.equal(isOpenForAsap(madrid('2026-10-24T08:30:00'), TZ), false);
  assert.equal(isOpenForAsap(madrid('2026-10-24T09:00:00'), TZ), true);
  assert.equal(isOpenForAsap(madrid('2026-10-24T14:45:00'), TZ), false);
  assert.equal(isOpenForAsap(Date.parse('2026-10-25T10:00:00+01:00'), TZ), false);
});

test('the cutoff follows the hours it is given (e.g. a late Friday on Google)', () => {
  const lateFriday: DayHours[] = FALLBACK_HOURS.map((day) =>
    day.day === 5 ? { day: 5, ranges: [{ open: 8 * 60, close: 20 * 60 }] } : day,
  );
  const fri1900 = madrid('2026-10-23T19:00:00');
  assert.equal(isOpenForAsap(fri1900, TZ, 15, FALLBACK_HOURS), false);
  assert.equal(isOpenForAsap(fri1900, TZ, 15, lateFriday), true);
  assert.equal(isOpenForAsap(madrid('2026-10-23T19:31:00'), TZ, 15, lateFriday), false);
});

test('a holiday closure (no ranges that day) takes no orders', () => {
  const closedWednesday: DayHours[] = FALLBACK_HOURS.map((day) =>
    day.day === 3 ? { day: 3, ranges: [] } : day,
  );
  assert.equal(isOpenForAsap(madrid('2026-10-21T10:00:00'), TZ, 15, closedWednesday), false);
});

test('retail-only carts get the same 30-minute cutoff', () => {
  assert.equal(isOpenForAsap(madrid('2026-10-21T14:45:00'), TZ, 0), false);
});

test('scheduled collection cannot fall in the last 30 minutes', () => {
  const now = madrid('2026-10-21T09:00:00');
  assert.equal(validatePickupTime(new Date(madrid('2026-10-21T14:30:00')).toISOString(), now, TZ), 'ok');
  assert.equal(validatePickupTime(new Date(madrid('2026-10-21T14:45:00')).toISOString(), now, TZ), 'closed');
});

test('after the cutoff, ordering reopens at the next opening', () => {
  const sat = nextOrderingOpen(madrid('2026-10-24T14:40:00'), TZ);
  // Sunday is closed, so the next window is Monday 26 Oct 8:00 (CET, UTC+1).
  assert.equal(sat, '2026-10-26T07:00:00.000Z');
  const wedMorning = nextOrderingOpen(madrid('2026-10-21T07:00:00'), TZ);
  assert.equal(wedMorning, '2026-10-21T06:00:00.000Z');
});
