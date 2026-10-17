import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { clockLabel, describeWhen, openState } from '@/shared/lib/openNow';

/** The homepage's "open now / opens at" line. Madrid, CEST (UTC+2) in October. */
const TZ = 'Europe/Madrid';
const at = (local: string) => Date.parse(`${local}+02:00`);

test('open during hours, with the closing time', () => {
  const state = openState(FALLBACK_HOURS, at('2026-10-21T10:00:00'), TZ);
  assert.equal(state.open, true);
  assert.equal(state.open && clockLabel(state.closesAt, TZ), '15:00');
});

test('closed before opening says it opens today', () => {
  const now = at('2026-10-21T07:00:00');
  const state = openState(FALLBACK_HOURS, now, TZ);
  assert.equal(state.open, false);
  assert.equal(!state.open && state.opensAt && describeWhen(state.opensAt, now, 'es', TZ), 'hoy a las 8:00');
});

test('Saturday after closing skips the closed Sunday', () => {
  const now = at('2026-10-24T16:00:00');
  const state = openState(FALLBACK_HOURS, now, TZ);
  assert.equal(state.open, false);
  assert.equal(!state.open && state.opensAt && describeWhen(state.opensAt, now, 'en', TZ), 'Monday at 8:00');
});

test('closing time itself counts as closed', () => {
  assert.equal(openState(FALLBACK_HOURS, at('2026-10-21T15:00:00'), TZ).open, false);
});
