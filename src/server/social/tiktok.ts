import 'server-only';
import type { SocialPost } from './types';

/**
 * Latest videos from the café's TikTok, via the Display API
 * (`/v2/video/list/`). Needs an app approved for the `video.list` scope and an
 * access token for @easybeanscoffee — see docs/social-feed-setup.md.
 *
 * Never throws: no token, or a rejected one, returns an empty list.
 */

const ENDPOINT = 'https://open.tiktokapis.com/v2/video/list/';
const FIELDS = 'id,title,cover_image_url,share_url,create_time';
/** An hour, matching Instagram: TikTok's cover URLs are signed and expire too. */
const REVALIDATE_SECONDS = 3_600;

type ApiVideo = {
  id?: string;
  title?: string;
  cover_image_url?: string;
  share_url?: string;
  /** Unix seconds. */
  create_time?: number;
};

export async function getTikTokPosts(limit: number): Promise<SocialPost[]> {
  const token = process.env.TIKTOK_ACCESS_TOKEN?.trim();
  if (!token) return [];

  try {
    const res = await fetch(`${ENDPOINT}?fields=${FIELDS}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: limit }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[social] TikTok responded ${res.status}`);
      return [];
    }
    const body = (await res.json()) as {
      data?: { videos?: ApiVideo[] };
      error?: { code?: string; message?: string };
    };
    // TikTok answers 200 with an error object rather than an HTTP status.
    if (body.error?.code && body.error.code !== 'ok') {
      console.warn(`[social] TikTok error ${body.error.code}: ${body.error.message ?? ''}`);
      return [];
    }
    return (body.data?.videos ?? []).flatMap(toPost);
  } catch (error) {
    console.warn('[social] TikTok request failed', error);
    return [];
  }
}

function toPost(video: ApiVideo): SocialPost[] {
  if (!video.id || !video.share_url || !video.cover_image_url) return [];
  const title = (video.title ?? '').replace(/#\S+/g, '').trim();
  return [
    {
      id: `tt-${video.id}`,
      platform: 'tiktok',
      permalink: video.share_url,
      imageUrl: video.cover_image_url,
      caption: title.length > 60 ? `${title.slice(0, 57).trimEnd()}…` : title,
      postedAt: video.create_time ? new Date(video.create_time * 1000).toISOString() : null,
      isVideo: true,
      remote: true,
    },
  ];
}
