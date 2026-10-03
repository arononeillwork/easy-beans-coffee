import Container from '@mui/material/Container';
import type { SiteContent } from '@/i18n/content/en';
import { getSocialFeed } from '@/server/social/feed';
import { SocialBoard } from './client/SocialBoard';

/**
 * Server component: the Instagram and TikTok tokens stay on the server, and
 * the browser only receives the finished list of posts. The grid itself is
 * interactive (the network buttons filter it), so it lives in SocialBoard.
 */
export async function SocialFeed({ t }: { t: SiteContent }) {
  const { posts, live } = await getSocialFeed(t.social.captions);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
      <SocialBoard
        posts={posts}
        labels={{
          eyebrow: t.social.eyebrow,
          handle: t.social.handle,
          instagram: t.social.instagram,
          tiktok: t.social.tiktok,
          note: live ? t.social.noteLive : t.social.note,
          empty: t.social.empty,
          showAll: t.social.showAll,
          viewPost: t.social.viewPost,
        }}
      />
    </Container>
  );
}
