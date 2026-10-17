import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes } from 'date-fns';
import type { DayHours } from './openingHours';

/**
 * "Are we open right now, and if not, when?" — from the same live Google hours
 * the footer prints. Pure, so the homepage line and the cart agree and both can
 * be unit-tested without a clock.
 */
export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string | null };

const END_OF_DAY = 24 * 60;

function minutesNow(nowMs: number, timezone: string) {
  const now = new TZDate(nowMs, timezone);
  return { now, minutes: now.getHours() * 60 + now.getMinutes() };
}

function dayStart(day: Date, timezone: string) {
  return new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, timezone);
}

export function openState(hours: DayHours[], nowMs: number, timezone: string): OpenState {
  const { now, minutes } = minutesNow(nowMs, timezone);
  const today = hours.find((d) => d.day === now.getDay())?.ranges ?? [];
  for (const range of today) {
    const close = range.close ?? END_OF_DAY;
    if (minutes >= range.open && minutes < close) {
      return { open: true, closesAt: addMinutes(dayStart(now, timezone), close).toISOString() };
    }
  }
  for (let d = 0; d <= 7; d++) {
    const day = addDays(now, d);
    const ranges = hours.find((entry) => entry.day === day.getDay())?.ranges ?? [];
    for (const range of [...ranges].sort((a, b) => a.open - b.open)) {
      const at = addMinutes(dayStart(day, timezone), range.open).getTime();
      if (at > nowMs) return { open: false, opensAt: new Date(at).toISOString() };
    }
  }
  return { open: false, opensAt: null };
}

/** "8:00", "15:30" in café time. */
export function clockLabel(iso: string, timezone: string): string {
  const d = new TZDate(Date.parse(iso), timezone);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "today at 8:00" / "mañana a las 8:00" / "Monday at 8:00", in café time. */
export function describeWhen(iso: string, nowMs: number, lang: string, timezone: string): string {
  const time = clockLabel(iso, timezone);
  const dayKey = (ms: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  const target = Date.parse(iso);
  const es = lang === 'es';
  if (dayKey(target) === dayKey(nowMs)) return es ? `hoy a las ${time}` : `today at ${time}`;
  if (dayKey(target) === dayKey(nowMs + 86_400_000)) return es ? `mañana a las ${time}` : `tomorrow at ${time}`;
  const weekday = new Intl.DateTimeFormat(es ? 'es-ES' : 'en-GB', { timeZone: timezone, weekday: 'long' }).format(target);
  return es ? `el ${weekday} a las ${time}` : `${weekday} at ${time}`;
}
