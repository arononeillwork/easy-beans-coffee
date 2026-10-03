import 'server-only';
import type { Lang } from '@/i18n/config';
import type { DayHours } from '@/shared/lib/openingHours';
import { formatReviewDate, rankLatestTopRated } from './reviewFormat';

/**
 * Everything the site reads from the café's Google Maps listing: the rating,
 * the reviews, and the opening hours. One Place Details call serves all three —
 * Next dedupes it within a render and caches it across requests, so the footer
 * and the reviews band do not each pay for a fetch.
 *
 * Places returns at most five reviews and gives no sort parameter, so the
 * choice of which to show is made here — see `reviewFormat.ts`, which the
 * Business Profile source shares so both agree.
 *
 * `reviews` and `photos` are the two user-generated fields, and Google may omit
 * them from an otherwise complete 200 response — no error, the keys are simply
 * absent. **This is currently the case for this project**, which is why
 * `businessProfile.ts` exists; the note there explains what was ruled out.
 * Callers must treat empty reviews and empty photos as normal rather than as
 * "the fetch failed", which is why they are separate from `rating`: the rating
 * can be live while the reviews are not.
 *
 * Never throws. Anything missing — no key, no place id, an API error — resolves
 * to `null`, and callers fall back to the copy in the dictionary.
 */

const ENDPOINT = 'https://places.googleapis.com/v1/places';
const FIELDS =
  'id,rating,userRatingCount,googleMapsUri,googleMapsLinks,reviews,photos,regularOpeningHours';
/** Six hours: hours and reviews both change slowly, and this page is otherwise static. */
const REVALIDATE_SECONDS = 21_600;
/** Enough for the gallery to page through without paying for the whole album. */
const MAX_PHOTOS = 6;
/** Tall enough for a 2x retina card; Google bills per photo fetched, not per pixel. */
const PHOTO_MAX_HEIGHT = 1200;

export type PlaceReview = {
  id: string;
  author: string;
  initial: string;
  rating: number;
  text: string;
  /** Localised absolute date, e.g. "12 Mar 2026". */
  date: string;
  /** Google's own phrasing, e.g. "2 months ago". Already localised by the API. */
  relative: string;
  /** Epoch ms, for ranking. `0` when the source gave no usable timestamp. */
  publishedAt: number;
  url: string | null;
};

export type PlacePhoto = {
  id: string;
  /** Resolved googleusercontent URL — the API key is never in it. */
  url: string;
  /** Required by Google's policy wherever the photo is shown. */
  attribution: string | null;
  attributionUrl: string | null;
};

export type PlaceDetails = {
  rating: number | null;
  total: number | null;
  mapsUrl: string;
  /** Straight to the reviews tab rather than the listing. */
  reviewsUrl: string;
  writeReviewUrl: string;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
  /** Structured, unformatted — see `groupOpeningHours` for display. */
  hours: DayHours[] | null;
};

type ApiTime = { day?: number; hour?: number; minute?: number };

type ApiAttribution = { displayName?: string; uri?: string };

type ApiPhoto = {
  /** Opaque resource path, e.g. `places/XXX/photos/YYY` — not a URL. */
  name?: string;
  authorAttributions?: ApiAttribution[];
};

type ApiPlace = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: { reviewsUri?: string; writeAReviewUri?: string; placeUri?: string };
  reviews?: ApiReview[];
  photos?: ApiPhoto[];
  regularOpeningHours?: { periods?: { open?: ApiTime; close?: ApiTime }[] };
};

type ApiReview = {
  name?: string;
  rating?: number;
  publishTime?: string;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string };
};

function credentials(): { apiKey: string; placeId: string } | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  if (!apiKey || !placeId) return null;
  return { apiKey, placeId };
}

/** Places speaks BCP-47; our locales map straight across. */
function languageCode(lang: Lang): string {
  return lang === 'en' ? 'en' : 'es';
}

function toReview(raw: ApiReview, lang: Lang, index: number): PlaceReview | null {
  const text = raw.text?.text ?? raw.originalText?.text ?? '';
  const author = raw.authorAttribution?.displayName?.trim() ?? '';
  if (!text || !author) return null;
  return {
    id: raw.name ?? `review-${index}`,
    author,
    initial: author.charAt(0).toUpperCase(),
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    text,
    date: formatReviewDate(raw.publishTime, lang),
    relative: raw.relativePublishTimeDescription ?? '',
    publishedAt: raw.publishTime ? Date.parse(raw.publishTime) || 0 : 0,
    url: raw.googleMapsUri ?? raw.authorAttribution?.uri ?? null,
  };
}

/**
 * Place Photos hands back a resource name, not a URL. Asking for the media with
 * `skipHttpRedirect` returns the googleusercontent link as JSON instead of a
 * 302, which keeps the API key on the server — the browser only ever sees the
 * resolved link. One extra request per photo, cached for as long as the details.
 */
async function resolvePhoto(raw: ApiPhoto, apiKey: string, index: number): Promise<PlacePhoto | null> {
  if (!raw.name) return null;
  const url = `https://places.googleapis.com/v1/${raw.name}/media?maxHeightPx=${PHOTO_MAX_HEIGHT}&skipHttpRedirect=true`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': apiKey },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[places] Place Photo responded ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { photoUri?: string };
    if (!body.photoUri) return null;

    const credit = raw.authorAttributions?.[0];
    return {
      id: raw.name ?? `photo-${index}`,
      url: body.photoUri,
      attribution: credit?.displayName?.trim() || null,
      attributionUrl: credit?.uri ?? null,
    };
  } catch (error) {
    console.warn('[places] Place Photo request failed', error);
    return null;
  }
}

function minutesOf(time: ApiTime | undefined): number | null {
  if (!time || typeof time.hour !== 'number') return null;
  return time.hour * 60 + (time.minute ?? 0);
}

/**
 * Places gives one period per opening span, keyed by weekday (0 = Sunday). A
 * span that closes after midnight is filed under the day it *opens*, which is
 * what we want on a list of opening hours.
 */
function toDayHours(place: ApiPlace): DayHours[] | null {
  const periods = place.regularOpeningHours?.periods;
  if (!periods || periods.length === 0) return null;

  const byDay = new Map<number, DayHours['ranges']>();
  for (const period of periods) {
    const day = period.open?.day;
    const open = minutesOf(period.open);
    if (typeof day !== 'number' || open === null) continue;
    const ranges = byDay.get(day) ?? [];
    ranges.push({ open, close: minutesOf(period.close) });
    byDay.set(day, ranges);
  }
  if (byDay.size === 0) return null;

  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    ranges: (byDay.get(day) ?? []).sort((a, b) => a.open - b.open),
  }));
}

export async function getPlaceDetails(lang: Lang): Promise<PlaceDetails | null> {
  const creds = credentials();
  if (!creds) return null;

  const url = `${ENDPOINT}/${encodeURIComponent(creds.placeId)}?languageCode=${languageCode(lang)}`;

  let place: ApiPlace;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': creds.apiKey,
        'X-Goog-FieldMask': FIELDS,
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[places] Place Details responded ${res.status}`);
      return null;
    }
    place = (await res.json()) as ApiPlace;
  } catch (error) {
    console.warn('[places] Place Details request failed', error);
    return null;
  }

  const resolved = await Promise.all(
    (place.photos ?? []).slice(0, MAX_PHOTOS).map((photo, i) => resolvePhoto(photo, creds.apiKey, i)),
  );

  const mapsUrl =
    place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${creds.placeId}`;

  return {
    rating: typeof place.rating === 'number' ? place.rating : null,
    total: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    mapsUrl,
    reviewsUrl: place.googleMapsLinks?.reviewsUri ?? mapsUrl,
    writeReviewUrl:
      place.googleMapsLinks?.writeAReviewUri ??
      `https://search.google.com/local/writereview?placeid=${encodeURIComponent(creds.placeId)}`,
    reviews: rankLatestTopRated(
      (place.reviews ?? []).flatMap((raw, i) => {
        const review = toReview(raw, lang, i);
        return review ? [review] : [];
      }),
    ),
    photos: resolved.filter((photo): photo is PlacePhoto => photo !== null),
    hours: toDayHours(place),
  };
}
