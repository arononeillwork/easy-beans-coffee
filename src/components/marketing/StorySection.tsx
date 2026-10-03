import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';

/**
 * The first beat after the hero, and the only one that is purely typographic.
 *
 * Deliberately image-free: the hero, the film and the can section either side
 * of it are all photography, so the page needs one place to simply speak. The
 * headline runs at display size in the wider column and the detail sits beside
 * it, which reads as an opening statement rather than a caption.
 */
export function StorySection({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 3, md: 9 }} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 500,
                letterSpacing: '-0.025em',
                lineHeight: 1.16,
                textWrap: 'balance',
              }}
            >
              {t.story.headline}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.75} alignItems="flex-start">
              {t.story.paragraphs.map((paragraph) => (
                <Typography key={paragraph} color="text.secondary" sx={{ maxWidth: '56ch' }}>
                  {paragraph}
                </Typography>
              ))}
              <Box
                component={Link}
                href={localePath(lang, '/about')}
                sx={{
                  fontFamily: 'var(--font-figtree)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: brand.rosePinkDeep,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${brand.rosePink}`,
                  '&:hover': { color: brand.ink, borderBottomColor: brand.ink },
                }}
              >
                {t.story.cta}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
