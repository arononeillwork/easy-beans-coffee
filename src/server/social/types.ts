export type SocialPlatform = 'instagram' | 'facebook';

/**
 * One tile in the follow-along grid, normalised so the component never branches
 * on where a post came from (the café's Instagram through the Business Agent, or
 * its Facebook Page while Instagram isn't connected there).
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
