import type { Lang } from '@/i18n/config';

/**
 * Opening hours as data, plus the one formatter that turns them into the
 * footer's "Mon – Fri 8:00 – 18:00" rows.
 *
 * Kept out of the server module on purpose: the shape is a plain value, so it
 * can be formatted anywhere and unit-tested without a network call.
 */

/** Minutes from midnight. `close: null` means Google reported no closing time. */
export type HourRange = { open: number; close: number | null };

/** `day` follows JS/Google convention: 0 = Sunday. */
export type DayHours = { day: number; ranges: HourRange[] };

export type HoursRow = { label: string; value: string };

/** "8:00", "18:30" — no leading zero on the hour, matching the printed sign. */
function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function formatRanges(
  ranges: HourRange[],
  labels: { closed: string; allDay: string },
): string {
  if (ranges.length === 0) return labels.closed;
  return ranges
    .map((range) =>
      range.close === null
        ? labels.allDay
        : `${formatMinutes(range.open)} – ${formatMinutes(range.close)}`,
    )
    .join(', ');
}

/**
 * Weekday name in the active locale. A run of days is abbreviated so the row
 * stays short ("Mon – Fri"); a day standing alone is spelled out ("Saturday"),
 * which is how the printed hours read.
 */
function dayName(day: number, lang: Lang, style: 'short' | 'long'): string {
  // 2024-01-07 was a Sunday, so +day lands on the weekday we want.
  const reference = new Date(Date.UTC(2024, 0, 7 + day));
  const name = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'es-ES', {
    weekday: style,
    timeZone: 'UTC',
  }).format(reference);
  // Spanish weekdays are lower-case and the short form carries a full stop.
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/\.$/, '');
}

/**
 * Collapses seven days into the fewest rows: consecutive days sharing the same
 * hours become one "Mon – Fri" row, and the week starts on Monday rather than
 * Google's Sunday.
 */
export function groupOpeningHours(
  days: DayHours[],
  lang: Lang,
  labels: { closed: string; allDay: string },
): HoursRow[] {
  const mondayFirst = [1, 2, 3, 4, 5, 6, 0]
    .map((day) => days.find((entry) => entry.day === day))
    .filter((entry): entry is DayHours => entry !== undefined);
  if (mondayFirst.length === 0) return [];

  const rows: HoursRow[] = [];
  let runStart = mondayFirst[0];
  let runEnd = mondayFirst[0];
  let runValue = formatRanges(runStart.ranges, labels);

  const push = () => {
    const label =
      runStart.day === runEnd.day
        ? dayName(runStart.day, lang, 'long')
        : `${dayName(runStart.day, lang, 'short')} – ${dayName(runEnd.day, lang, 'short')}`;
    rows.push({ label, value: runValue });
  };

  for (const entry of mondayFirst.slice(1)) {
    const value = formatRanges(entry.ranges, labels);
    if (value === runValue) {
      runEnd = entry;
      continue;
    }
    push();
    runStart = entry;
    runEnd = entry;
    runValue = value;
  }
  push();

  return rows;
}
