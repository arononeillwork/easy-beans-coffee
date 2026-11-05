import 'server-only';
import type { SocialPost } from './types';
import { feedUrl } from '../feedBase';
import { getInstagramToken } from './instagramToken';

/**
 * Latest posts from the café's Instagram account, via the Instagram Graph API
 * (`graph.instagram.com/me/media`). Needs a long-lived access token from an
 * Instagram **Business or Creator** account — see docs/social-feed-setup.md.
 *
 * The old Basic Display API this used to be built on was switched off in
 * December 2024; there is no token-free way to read a feed any more.
 *
 * The grid's read never throws: a missing or expired token returns an empty
 * list and the grid falls back to our own photography. The café TV's read
 * (getLatestInstagramPost) is the one that does, on purpose.
 */

const GRAPH = 'https://graph.instagram.com/v21.0';
const ENDPOINT = `${GRAPH}/me/media`;
const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
/** An hour: the CDN URLs Instagram hands out are signed and time-limited. */
const REVALIDATE_SECONDS = 3_600;

type ApiMedia = {
  id?: string;
  caption?: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export async function getInstagramPosts(limit: number): Promise<SocialPost[]> {
  const token = await instagramToken();
  if (!token) return [];
  try {
    return (await requestMedia(token, limit, REVALIDATE_SECONDS)).flatMap(toPost);
  } catch (error) {
    // 190 = token expired or revoked, which is the failure worth spotting.
    console.warn('[social] Instagram request failed', error);
    return [];
  }
}

/**
 * The newest post with a picture, for the café TV (/display-menu), asked for
 * every `revalidateSeconds` so a new post reaches the screen within minutes.
 *
 * Unlike the grid it does not swallow failures. null means there is nothing to
 * show (no token, no posts); an Instagram that does not answer throws, so the
 * TV keeps the post it already has instead of dropping to its fallback poster
 * until the next check.
 */
export async function getLatestInstagramPost(revalidateSeconds: number): Promise<LatestPost | null> {
  const token = await instagramToken();
  if (!token) return null;
  // A few, in case the newest one has no picture to show.
  const newest = (await requestMedia(token, 3, revalidateSeconds)).find((media) => media.id && imageOf(media));
  return newest?.id ? { mediaId: newest.id, caption: firstLine(newest.caption ?? '') } : null;
}

export type LatestPost = {
  /** Instagram's id for the post; its picture is asked for by this (getInstagramPostImageUrl). */
  mediaId: string;
  /** The caption's first line, hashtags dropped. */
  caption: string;
};

/**
 * The picture of one of the café's own posts (a video's still, a carousel's
 * first picture), asked for afresh: the addresses Instagram hands out are
 * signed and expire. null when there is no token, or Instagram does not know
 * the post — it only answers for the account's own media.
 */
export async function getInstagramPostImageUrl(mediaId: string): Promise<string | null> {
  const token = await instagramToken();
  if (!token) return null;
  const url = feedUrl('instagram', `${GRAPH}/${mediaId}?fields=media_type,media_url,thumbnail_url&access_token=${encodeURIComponent(token)}`);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return imageOf((await res.json()) as ApiMedia) ?? null;
  } catch {
    return null;
  }
}

async function instagramToken(): Promise<string | null> {
  // Under the e2e stand-in the env token is the whole story; never read the
  // real token store from a test run.
  return process.env.E2E_FEEDS_BASE ? process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null : getInstagramToken();
}

/** The account's newest media, newest first. Throws when Instagram does not answer. */
async function requestMedia(token: string, limit: number, revalidateSeconds: number): Promise<ApiMedia[]> {
  const url = feedUrl(
    'instagram',
    `${ENDPOINT}?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
  );
  const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!res.ok) throw new Error(`Instagram responded ${res.status}`);
  const body = (await res.json()) as { data?: ApiMedia[] };
  return body.data ?? [];
}

/** A video's media_url is the file itself; thumbnail_url is the still we want. */
function imageOf(media: ApiMedia): string | undefined {
  return media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url;
}

function toPost(media: ApiMedia): SocialPost[] {
  const image = imageOf(media);
  if (!media.id || !media.permalink || !image) return [];
  return [
    {
      id: `ig-${media.id}`,
      platform: 'instagram',
      permalink: media.permalink,
      imageUrl: image,
      caption: firstLine(media.caption ?? ''),
      postedAt: media.timestamp ?? null,
      isVideo: media.media_type === 'VIDEO',
      remote: true,
    },
  ];
}

/** Captions run long and carry hashtag tails; the tile shows one line. */
function firstLine(caption: string): string {
  const line = caption.split('\n')[0]?.replace(/#\S+/g, '').trim() ?? '';
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}

export type InstagramHealth =
  | { state: 'not_set' }
  | { state: 'ok'; posts: number }
  | { state: 'rejected'; status: number; code: number | null; message: string | null };

/**
 * One live call to Instagram, for the status page: is there a token, and does
 * Instagram accept it? Error 190 means expired or revoked. Never returns the token.
 */
export async function instagramHealth(): Promise<InstagramHealth> {
  const token = await getInstagramToken(false);
  if (!token) return { state: 'not_set' };
  try {
    const res = await fetch(`${ENDPOINT}?fields=id&limit=3&access_token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { data?: unknown[]; error?: { code?: number; message?: string } };
    if (!res.ok) {
      return { state: 'rejected', status: res.status, code: body.error?.code ?? null, message: body.error?.message?.slice(0, 160) ?? null };
    }
    return { state: 'ok', posts: body.data?.length ?? 0 };
  } catch (error) {
    return { state: 'rejected', status: 0, code: null, message: (error as Error).message.slice(0, 160) };
  }
}
