import 'server-only';
import type { Lang } from '@/i18n/config';
import type { PlaceReview } from './googlePlaces';
import { formatReviewDate, rankLatestTopRated, relativeReviewTime } from './reviewFormat';

/**
 * The café's reviews read from its **own** Google Business Profile, rather than
 * from the public Places listing.
 *
 * Why this exists at all: Places stopped returning the `reviews` and `photos`
 * fields for this project. Every other field still arrives — rating, hours,
 * even atmosphere data like `servesBrunch` — so it is not a billing tier or a
 * key problem, and it is not this listing: the same key returns no reviews for
 * a landmark with a hundred thousand of them. Google applies different Places
 * functionality to EEA billing accounts, which is the likeliest cause and not
 * something the code can work around.
 *
 * Reading the profile we own sidesteps that, and is better anyway: all of the
 * reviews instead of Places' hard cap of five, sorted how we ask.
 *
 * The catch is setup. This needs an OAuth client, a one-time consent by an
 * owner of the profile, and — separately — Google approving the project for
 * Business Profile API access, which takes about a fortnight. Until all three
 * land, this returns `[]` and the band falls back to the Places reviews and
 * then to our own captions, exactly as before. Nothing here is load-bearing.
 *
 * See docs/google-reviews-setup.md. Reviews are still on the legacy v4 host;
 * Google migrated the rest of this API to v1 and left reviews behind.
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVIEWS_HOST = 'https://mybusiness.googleapis.com/v4';
/** Matches the Places cache — the band should not refresh in two rhythms. */
const REVALIDATE_SECONDS = 21_600;
/** The API's own maximum. We rank and trim afterwards. */
const PAGE_SIZE = 50;

const STAR_VALUES: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

type ApiReviewer = {
  displayName?: string;
  profilePhotoUrl?: string;
  isAnonymous?: boolean;
};

type ApiReview = {
  reviewId?: string;
  name?: string;
  reviewer?: ApiReviewer;
  /** Enum, not a number: `FIVE`, not `5`. */
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

function credentials() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim();
  /** Full resource name: `accounts/{account}/locations/{location}`. */
  const location = process.env.GOOGLE_BUSINESS_LOCATION?.trim();
  if (!clientId || !clientSecret || !refreshToken || !location) return null;
  return { clientId, clientSecret, refreshToken, location };
}

/**
 * Refresh tokens do not expire on their own; access tokens last an hour. Since
 * the reviews themselves are only re-fetched every six hours there is nothing
 * worth caching here — one token request per refresh, deliberately unstored.
 */
async function accessToken(creds: NonNullable<ReturnType<typeof credentials>>): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      // `invalid_grant` here means the consent was revoked or the token was
      // issued against a different OAuth client — re-run the setup script.
      console.warn(`[places] Business Profile token exchange responded ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { access_token?: string };
    return body.access_token ?? null;
  } catch (error) {
    console.warn('[places] Business Profile token exchange failed', error);
    return null;
  }
}

/**
 * A review written in another language comes back as both halves in one string:
 *
 *   (Translated by Google) Lovely spot…\n\n(Original)\nUn sitio precioso…
 *
 * The translated half is the one a general audience can read, so that is what
 * the card shows. Reviews with no marker pass through untouched.
 */
function preferredText(comment: string): string {
  const marker = comment.indexOf('(Original)');
  const text = marker === -1 ? comment : comment.slice(0, marker);
  return text.replace('(Translated by Google)', '').trim();
}

function toReview(raw: ApiReview, lang: Lang, index: number): PlaceReview | null {
  const comment = raw.comment ? preferredText(raw.comment) : '';
  const author = raw.reviewer?.displayName?.trim() ?? '';
  // Star-only ratings carry no comment, and the band is a wall of words —
  // they still count towards the rating Places gives us, just not a card.
  if (!comment || !author || raw.reviewer?.isAnonymous) return null;

  const published = raw.createTime ?? raw.updateTime;
  return {
    id: raw.reviewId ?? raw.name ?? `own-review-${index}`,
    author,
    initial: author.charAt(0).toUpperCase(),
    rating: STAR_VALUES[raw.starRating ?? ''] ?? 0,
    text: comment,
    date: formatReviewDate(published, lang),
    relative: relativeReviewTime(published, lang),
    publishedAt: published ? Date.parse(published) || 0 : 0,
    // v4 gives no per-review permalink. The section falls back to the
    // listing's reviews tab, which is where the card should point anyway.
    url: null,
  };
}

/**
 * Never throws. Anything missing — no credentials, no approval yet, an expired
 * consent — resolves to an empty list and the caller falls back to Places.
 */
export async function getBusinessReviews(lang: Lang): Promise<PlaceReview[]> {
  const creds = credentials();
  if (!creds) return [];

  const token = await accessToken(creds);
  if (!token) return [];

  const url =
    `${REVIEWS_HOST}/${creds.location}/reviews` +
    `?pageSize=${PAGE_SIZE}&orderBy=${encodeURIComponent('updateTime desc')}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      // 403 with a zero quota is the "not approved yet" case; 404 means
      // GOOGLE_BUSINESS_LOCATION names a location this account cannot manage.
      console.warn(`[places] Business Profile reviews responded ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { reviews?: ApiReview[] };
    const reviews = (body.reviews ?? []).flatMap((raw, i) => {
      const review = toReview(raw, lang, i);
      return review ? [review] : [];
    });
    return rankLatestTopRated(reviews);
  } catch (error) {
    console.warn('[places] Business Profile reviews request failed', error);
    return [];
  }
}
