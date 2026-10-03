import 'server-only';
import { INSTAGRAM_URL, TIKTOK_URL } from '@/shared/lib/social';
import { getInstagramPosts } from './instagram';
import { getTikTokPosts } from './tiktok';
import type { SocialPost } from './types';

export const FEED_LIMIT = 8;

/**
 * Our own photography, shown until at least one network is connected. The
 * links go to the profile because there is no post behind these — the moment a
 * token is configured they are replaced wholesale by real posts with real
 * permalinks.
 */
const CURATED: Omit<SocialPost, 'caption'>[] = [
  {
    id: 'curated-matcha',
    platform: 'instagram',
    permalink: INSTAGRAM_URL,
    imageUrl: '/media/strawberry-matcha-can.webp',
    postedAt: null,
    isVideo: false,
    remote: false,
  },
  {
    id: 'curated-acai',
    platform: 'instagram',
    permalink: INSTAGRAM_URL,
    imageUrl: '/media/acai-bowl.webp',
    postedAt: null,
    isVideo: false,
    remote: false,
  },
  {
    id: 'curated-ube',
    platform: 'instagram',
    permalink: INSTAGRAM_URL,
    imageUrl: '/media/ube-latte.webp',
    postedAt: null,
    isVideo: false,
    remote: false,
  },
  {
    id: 'curated-dog',
    platform: 'tiktok',
    permalink: TIKTOK_URL,
    imageUrl: '/media/dog-story.webp',
    postedAt: null,
    isVideo: true,
    remote: false,
  },
];

export type SocialFeed = {
  posts: SocialPost[];
  /** True once at least one network answered with real posts. */
  live: boolean;
};

/**
 * Newest posts across both networks.
 *
 * Live and curated are never mixed: as soon as one network answers, the grid is
 * entirely real posts. Half a feed of stand-ins next to real ones would be
 * impossible for a visitor to tell apart.
 */
export async function getSocialFeed(fallbackCaptions: string[]): Promise<SocialFeed> {
  const [instagram, tiktok] = await Promise.all([
    getInstagramPosts(FEED_LIMIT),
    getTikTokPosts(FEED_LIMIT),
  ]);

  const live = [...instagram, ...tiktok];
  if (live.length > 0) {
    const posts = live
      .sort((a, b) => Date.parse(b.postedAt ?? '0') - Date.parse(a.postedAt ?? '0'))
      .slice(0, FEED_LIMIT);
    return { posts, live: true };
  }

  return {
    posts: CURATED.map((post, i) => ({ ...post, caption: fallbackCaptions[i] ?? '' })),
    live: false,
  };
}
