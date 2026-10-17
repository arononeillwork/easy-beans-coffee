import { TZDate } from '@date-fns/tz';

/** The winner is drawn on this day of every month (Europe/Madrid). */
export const DRAW_DAY = 15;

/**
 * Which monthly draw an entry made at `at` belongs to, as the first of that
 * month (`YYYY-MM-01`). Entries up to and including the 15th go into that
 * month's draw; from the 16th they roll into next month's.
 */
export function drawMonthFor(at: Date = new Date()): string {
  const local = new TZDate(at, 'Europe/Madrid');
  let year = local.getFullYear();
  let month = local.getMonth() + 1; // 1-12
  if (local.getDate() > DRAW_DAY) {
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
