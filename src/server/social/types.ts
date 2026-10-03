export type SocialPlatform = 'instagram' | 'tiktok';

/**
 * One tile in the follow-along grid, normalised across the two networks so the
 * component never branches on where a post came from.
 */
export type SocialPost = {
  id: string;
  platform: SocialPlatform;
  /** Direct link to the post itself, not the profile. */
  permalink: string;
  imageUrl: string;
  caption: string;
  /** ISO timestamp, used only for sorting newest-first. */
  postedAt: string | null;
  isVideo: boolean;
  /** Off-site images need `unoptimized`; our own /media files do not. */
  remote: boolean;
};
