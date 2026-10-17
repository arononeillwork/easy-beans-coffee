import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { priceReadDueMs } from '@/features/menu/display/refreshSchedule';

/**
 * The display board's daily Square read: due one hour after opening, café
 * time. Madrid, CEST (UTC+2) in October; FALLBACK_HOURS opens weekdays at
 * 8:00, Saturday at 9:00, closed Sunday.
 */
const TZ = 'Europe/Madrid';
const at = (local: string) => Date.parse(`${local}+02:00`);

test('a weekday read is due at 9:00, an hour after the 8:00 opening', () => {
  const due = priceReadDueMs(FALLBACK_HOURS, at('2026-10-21T06:00:00'), TZ);
  assert.equal(due, at('2026-10-21T09:00:00'));
});

test('the due moment is the same asked before or after it', () => {
  const morning = priceReadDueMs(FALLBACK_HOURS, at('2026-10-21T07:30:00'), TZ);
  const evening = priceReadDueMs(FALLBACK_HOURS, at('2026-10-21T22:00:00'), TZ);
  assert.equal(morning, evening);
});

test('Saturday follows its own later opening', () => {
  const due = priceReadDueMs(FALLBACK_HOURS, at('2026-10-24T08:00:00'), TZ);
  assert.equal(due, at('2026-10-24T10:00:00'));
});

test('a closed day owes no read', () => {
  assert.equal(priceReadDueMs(FALLBACK_HOURS, at('2026-10-25T12:00:00'), TZ), null);
});

test('split hours key off the first opening of the day', () => {
  const split = [{ day: 3, ranges: [{ open: 16 * 60, close: 20 * 60 }, { open: 8 * 60, close: 12 * 60 }] }];
  const due = priceReadDueMs(split, at('2026-10-21T07:00:00'), TZ);
  assert.equal(due, at('2026-10-21T09:00:00'));
});
