import 'server-only';
import type { SocialPost } from './types';

/**
 * Latest posts from the café's Instagram account, via the Instagram Graph API
 * (`graph.instagram.com/me/media`). Needs a long-lived access token from an
 * Instagram **Business or Creator** account — see docs/social-feed-setup.md.
 *
 * The old Basic Display API this used to be built on was switched off in
 * December 2024; there is no token-free way to read a feed any more.
 *
 * Never throws: a missing or expired token returns an empty list and the grid
 * falls back to our own photography.
 */

const ENDPOINT = 'https://graph.instagram.com/v21.0/me/media';
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
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return [];

  const url = `${ENDPOINT}?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) {
      // 190 = token expired or revoked, which is the failure worth spotting.
      console.warn(`[social] Instagram responded ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { data?: ApiMedia[] };
    return (body.data ?? []).flatMap(toPost);
  } catch (error) {
    console.warn('[social] Instagram request failed', error);
    return [];
  }
}

function toPost(media: ApiMedia): SocialPost[] {
  // A video's media_url is the file itself; thumbnail_url is the still we want.
  const image = media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url;
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
