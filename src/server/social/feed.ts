import 'server-only';
import { INSTAGRAM_URL } from '@/shared/lib/social';
import { captionLine } from '@/features/social/agentPosts';
import { getAgentPosts } from '../businessAgent/postsFeed';
import type { SocialPost } from './types';

export const FEED_LIMIT = 8;

/**
 * Our own photography, shown until the Business Agent has posts to give (its
 * Instagram not connected, or the agent never reached). The links go to the
 * profile because there is no post behind these — the moment the agent answers
 * with posts they are replaced wholesale by real posts with real permalinks.
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
  // Instagram, like the rest: the section is Instagram's, and the café asked
  // for no TikTok link beside it.
  {
    id: 'curated-dog',
    platform: 'instagram',
    permalink: INSTAGRAM_URL,
    imageUrl: '/media/dog-story.webp',
    postedAt: null,
    isVideo: false,
    remote: false,
  },
];

export type SocialFeed = {
  posts: SocialPost[];
  /** True once the agent answered with real posts. */
  live: boolean;
  /** The account the posts are from, as the agent has it; null: the café's own, as shipped. */
  account: { handle: string; url: string } | null;
};

/**
 * The newest posts, from the café's Instagram as the Business Agent reads it
 * (server/businessAgent/postsFeed): the agent holds the Instagram connection,
 * the site holds no token.
 *
 * Live and curated are never mixed: as soon as the agent answers with posts,
 * the grid is entirely real posts. Half a feed of stand-ins next to real ones
 * would be impossible for a visitor to tell apart.
 */
export async function getSocialFeed(fallbackCaptions: string[]): Promise<SocialFeed> {
  const feed = await getAgentPosts();
  const account = feed?.account?.url ? { handle: feed.account.handle, url: feed.account.url } : null;

  if (feed && feed.posts.length > 0) {
    const posts = feed.posts.slice(0, FEED_LIMIT).map(
      (post): SocialPost => ({
        id: post.id,
        platform: feed.source === 'facebook' ? 'facebook' : 'instagram',
        permalink: post.permalink,
        imageUrl: post.image_url,
        caption: captionLine(post.caption),
        postedAt: post.posted_at,
        isVideo: post.video,
        remote: !post.image_url.startsWith('/'),
      }),
    );
    return { posts, live: true, account };
  }

  return {
    posts: CURATED.map((post, i) => ({ ...post, caption: fallbackCaptions[i] ?? '' })),
    live: false,
    account,
  };
}
