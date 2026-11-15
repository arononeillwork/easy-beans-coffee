import { rankLatestTopRated } from '@/server/places/reviewFormat';

/**
 * The café's Google rating and reviews as the Business Agent has them — its
 * back office, which reads Google (the café's own Business Profile, every hour)
 * and keeps every review on its Reviews page. The site reads them from there
 * rather than from Google, so it needs no Google key of its own and shows the
 * same rating as the agent and Google Maps.
 *
 * The feed's contract lives in the business-agent repo, docs/WEBSITE.md → "The
 * Google rating and reviews" (`SiteReviewsFeed`). This module is the plain-data
 * half — parsing it and turning it into what the pages use — so it can be
 * unit-tested without a network call. The fetch is server/businessAgent/
 * reviewsFeed.
 */

export interface AgentReview {
  id: string;
  rating: number;
  text: string;
  reviewer: string;
  created_at: string;
  language: 'es' | 'en';
  reply: string | null;
  url: string | null;
  photos: Array<{ url: string; thumb: string | null }>;
}

/** The agent's feed (version 1), as far as the site reads it. */
export interface AgentReviews {
  version: 1;
  business: { id: number; name: string };
  source: 'business_profile' | 'places' | null;
  rating: number | null;
  count: number | null;
  maps_url: string | null;
  write_review_url: string | null;
  reviews: AgentReview[];
  checked_at: string | null;
}

/** What the pages use. */
export interface CafeReviews {
  /** Google's average (4.7) and how many reviews it's from; null until there are some. */
  rating: number | null;
  total: number | null;
  /** The café on Google Maps, where its reviews are read. */
  reviewsUrl: string | null;
  /** Google's page for leaving one. */
  writeReviewUrl: string | null;
  /** The best of the newest, as the site has always picked them (server/places/reviewFormat). */
  reviews: Array<AgentReview & { publishedAt: number }>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const https = (v: unknown) => {
  const s = text(v);
  return s && /^https:\/\//i.test(s) ? s : null;
};
const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * The feed, checked: version 1 with its reviews listed. Anything else is null,
 * and the site keeps what it last read. A review it can't read is left out
 * rather than costing the rest.
 */
export function parseAgentReviews(raw: unknown): AgentReviews | null {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.reviews) || !isObject(raw.business)) return null;
  const rating = amount(raw.rating);
  return {
    version: 1,
    business: { id: amount(raw.business.id) ?? 0, name: text(raw.business.name) ?? '' },
    source: raw.source === 'business_profile' || raw.source === 'places' ? raw.source : null,
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
    count: amount(raw.count),
    maps_url: https(raw.maps_url),
    write_review_url: https(raw.write_review_url),
    reviews: raw.reviews.flatMap((r): AgentReview[] => {
      if (!isObject(r)) return [];
      const id = text(r.id), body = text(r.text), reviewer = text(r.reviewer), created = text(r.created_at);
      const stars = amount(r.rating);
      if (!id || !body || !reviewer || !created || !stars || stars < 1 || stars > 5) return [];
      return [{
        id, rating: stars, text: body, reviewer, created_at: created,
        language: r.language === 'es' ? 'es' : 'en',
        reply: text(r.reply),
        url: https(r.url),
        photos: Array.isArray(r.photos)
          ? r.photos.filter(isObject).flatMap((p) => (https(p.url) ? [{ url: https(p.url)!, thumb: https(p.thumb) }] : []))
          : [],
      }];
    }),
    checked_at: text(raw.checked_at),
  };
}

/** The agent's reviews, as the pages use them. */
export function cafeReviews(feed: AgentReviews): CafeReviews {
  return {
    rating: feed.rating,
    total: feed.count,
    reviewsUrl: feed.maps_url,
    writeReviewUrl: feed.write_review_url,
    reviews: rankLatestTopRated(feed.reviews.map((r) => ({ ...r, publishedAt: Date.parse(r.created_at) || 0 }))),
  };
}
