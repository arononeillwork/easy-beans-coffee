import 'server-only';
import type { DayHours } from '@/shared/lib/openingHours';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { periodsToDayHours, type ApiTime } from './googlePlaces';
import { feedUrl } from '../feedBase';

/**
 * The week online ordering follows: the café's hours as Google Maps has them
 * right now, so editing hours in Google Business Profile moves the online
 * cutoff with no deploy.
 *
 * `currentOpeningHours` is preferred over `regularOpeningHours` because it
 * already folds in special hours for the coming seven days — a bank-holiday
 * closure set on Google closes online ordering that day too. Its periods are
 * keyed by weekday exactly like the regular ones, and since it spans exactly
 * the next week, indexing it by weekday is unambiguous.
 *
 * Deliberately its own small request (two fields, no photos or reviews) on a
 * one-hour cache, rather than riding the footer's six-hour Place Details call:
 * hours that gate taking money should not lag a change by most of a shift.
 *
 * Never throws. No key, an API error or an empty answer all fall back to
 * FALLBACK_HOURS, so ordering keeps working on known-good hours.
 */

const REVALIDATE_SECONDS = 3_600;

type Periods = { periods?: { open?: ApiTime; close?: ApiTime }[] };

export async function getOrderingHours(): Promise<{ hours: DayHours[]; source: 'google' | 'fallback' }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  if (!apiKey || !placeId) return { hours: FALLBACK_HOURS, source: 'fallback' };

  try {
    const url = feedUrl('places', `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'currentOpeningHours,regularOpeningHours',
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[ordering-hours] Places responded ${res.status}`);
      return { hours: FALLBACK_HOURS, source: 'fallback' };
    }
    const place = (await res.json()) as {
      currentOpeningHours?: Periods;
      regularOpeningHours?: Periods;
    };
    const hours =
      periodsToDayHours(place.currentOpeningHours?.periods) ??
      periodsToDayHours(place.regularOpeningHours?.periods);
    return hours ? { hours, source: 'google' } : { hours: FALLBACK_HOURS, source: 'fallback' };
  } catch (error) {
    console.warn('[ordering-hours] request failed', error);
    return { hours: FALLBACK_HOURS, source: 'fallback' };
  }
}
