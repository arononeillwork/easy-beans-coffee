import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import type { SiteContent } from '@/i18n/content/en';
import { getSocialFeed } from '@/server/social/feed';
import { INSTAGRAM_URL } from '@/shared/lib/social';
import { brand, radius } from '@/theme/brand';

/**
 * The newest posts, straight from Instagram, each
 * opening its own post. Until a feed answers it shows our own photography
 * linking to the profile — silently; visitors do not need to know which.
 */
export async function InstagramGrid({ t }: { t: SiteContent }) {
  const { posts } = await getSocialFeed(t.social.captions);
  const shown = posts.slice(0, 8);

  return (
    <Box component="section" aria-labelledby="social-title">
      <Container maxWidth="lg" sx={{ py: { xs: 9, md: 14 } }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography id="social-title" variant="h2" sx={{ fontSize: { xs: 'clamp(1.6rem, 7.4vw, 2.25rem)', md: undefined } }}>
            <Box component="a" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: brand.rosePinkDeep } }}>
              {t.social.handle}
            </Box>
          </Typography>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1, md: 1.5 } }}>
          {shown.map((post, i) => (
            <Box
              key={post.id}
              component="a"
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="social-post"
              data-live={post.remote ? 'true' : 'false'}
              aria-label={post.caption ? `${t.social.viewPost}: ${post.caption}` : t.social.viewPost}
              sx={{
                position: 'relative',
                display: { xs: i < 4 ? 'block' : 'none', md: 'block' },
                aspectRatio: '1',
                borderRadius: `${radius.md}px`,
                overflow: 'hidden',
                backgroundColor: brand.limewashTint,
                '&:hover img': { transform: 'scale(1.03)' },
              }}
            >
              <Image
                src={post.imageUrl}
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 25vw"
                style={{ objectFit: 'cover', transition: 'transform 400ms cubic-bezier(.16,1,.3,1)' }}
              />
              {post.isVideo && (
                <PlayArrowRoundedIcon
                  aria-hidden
                  sx={{ position: 'absolute', top: 8, right: 8, color: brand.white, fontSize: 22, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.4))' }}
                />
              )}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
