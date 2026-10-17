import { TZDate } from '@date-fns/tz';
import { addMinutes } from 'date-fns';
import type { DayHours } from '@/shared/lib/openingHours';

/**
 * When today's Square read is due: one hour after the café opens, café time.
 *
 * The board re-reads items and prices once per day, and an hour into service
 * rather than at the stroke of opening — that is when the morning's price
 * edits in Square have actually been made. Pure, so the moment is unit-tested
 * against fixed clocks instead of discovered on the wall.
 *
 * `null` means the café does not open today (per the given hours), so no
 * read is owed.
 */
export function priceReadDueMs(hours: DayHours[], nowMs: number, timezone: string): number | null {
  const now = new TZDate(nowMs, timezone);
  const ranges = hours.find((day) => day.day === now.getDay())?.ranges ?? [];
  if (ranges.length === 0) return null;
  const opensAt = Math.min(...ranges.map((range) => range.open));
  const midnight = new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, timezone);
  return addMinutes(midnight, opensAt + 60).getTime();
}
