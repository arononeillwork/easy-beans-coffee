/**
 * The café's latest posts as the Business Agent reads them — from the Instagram
 * connected on its Connections page (or its Facebook Page while Instagram
 * isn't). The site reads them from there rather than from Instagram, so it
 * needs no Instagram token of its own: the café connects Instagram once, in the
 * agent, and the grid follows.
 *
 * The feed's contract lives in the business-agent repo, docs/WEBSITE.md → "The
 * latest posts" (`SitePostsFeed`). This module is the plain-data half, parsed
 * and unit-tested without a network call; the fetch is server/businessAgent/
 * postsFeed.
 */

export interface AgentPost {
  id: string;
  permalink: string;
  /** Instagram's own address for the picture (a video's cover): signed, and runs out in days. */
  image_url: string;
  caption: string | null;
  posted_at: string;
  video: boolean;
}

/** The agent's feed (version 1), as far as the site reads it. */
export interface AgentPosts {
  version: 1;
  business: { id: number; name: string };
  source: 'instagram' | 'facebook' | null;
  account: { handle: string; url: string | null } | null;
  posts: AgentPost[];
  fetched_at: string | null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
/** An https address; a path on this site too (`/media/…`), which only the test stand-in serves. */
const link = (v: unknown) => {
  const s = text(v);
  return s && (/^https:\/\//i.test(s) || /^\/(?!\/)/.test(s)) ? s : null;
};

/**
 * The feed, checked: version 1 with its posts listed. Anything else is null and
 * the site keeps what it last read; a post without a picture or a link is left
 * out rather than costing the rest.
 */
export function parseAgentPosts(raw: unknown): AgentPosts | null {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.posts) || !isObject(raw.business)) return null;
  const account = isObject(raw.account) && text(raw.account.handle)
    ? { handle: text(raw.account.handle)!.replace(/^@+/, ''), url: link(raw.account.url) }
    : null;
  return {
    version: 1,
    business: { id: typeof raw.business.id === 'number' ? raw.business.id : 0, name: text(raw.business.name) ?? '' },
    source: raw.source === 'instagram' || raw.source === 'facebook' ? raw.source : null,
    account,
    posts: raw.posts.flatMap((p): AgentPost[] => {
      if (!isObject(p)) return [];
      const id = text(p.id), permalink = link(p.permalink), image = link(p.image_url), posted = text(p.posted_at);
      if (!id || !permalink || !image || !posted) return [];
      return [{ id, permalink, image_url: image, caption: text(p.caption), posted_at: posted, video: p.video === true }];
    }),
    fetched_at: text(raw.fetched_at),
  };
}

/** Captions run long and carry hashtag tails; a tile shows one line. */
export function captionLine(caption: string | null): string {
  const line = (caption ?? '').split('\n')[0]?.replace(/#\S+/g, '').trim() ?? '';
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}
