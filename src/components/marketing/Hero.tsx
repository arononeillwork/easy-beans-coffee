import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';
import { HeroFilm } from './client/HeroFilm';

/**
 * Full-viewport hero over the film of a drink being made — powder, syrup,
 * the purple pour, the sealing machine, the counter, the barista — looping
 * quietly the way the café's own reels do. Film-led, short copy, three CTAs.
 * The scrim is bottom-anchored so the drink stays unclouded.
 */
export function Hero({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Box
      sx={{
        position: 'relative',
        // Deliberately short of the viewport: the ticker below has to be
        // visible on load, so the page reads as a page rather than a poster.
        height: { xs: '80dvh', md: '76dvh' },
        minHeight: 560,
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        backgroundColor: brand.roseWash,
      }}
    >
      <HeroFilm
        src="/media/hero-film.mp4"
        poster="/media/hero-poster.webp"
        backdrop="/media/hero-backdrop.webp"
        label={t.hero.filmLabel}
        playLabel={t.media.play}
        pauseLabel={t.media.pause}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(26,26,26,0.74) 0%, rgba(26,26,26,0.28) 42%, rgba(26,26,26,0) 72%)',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', pb: { xs: 7, md: 10 } }}>
        <Stack spacing={{ xs: 2.5, md: 3.25 }} alignItems="flex-start">
          <Typography variant="h6" component="p" sx={{ color: brand.cream }}>
            {t.hero.eyebrow}
          </Typography>
          <Typography
            variant="h1"
            sx={{ color: brand.cream, maxWidth: '16ch', textWrap: 'balance' }}
          >
            {t.hero.headline}
          </Typography>
          <Typography
            sx={{ color: brand.cream, maxWidth: '46ch', fontSize: { xs: '1rem', md: '1.125rem' } }}
          >
            {t.hero.sub}
          </Typography>
          <Stack direction="row" spacing={1.75} useFlexGap sx={{ flexWrap: 'wrap', pt: 0.5 }}>
            <Button
              component={Link}
              href={localePath(lang, '/order')}
              variant="contained"
              color="primary"
            >
              {t.hero.ctaOrder}
            </Button>
            {/* The menu and the ordering page are one page, so both buttons
                land there. */}
            <Button
              component={Link}
              href={localePath(lang, '/order')}
              variant="contained"
              sx={{
                backgroundColor: brand.cream,
                color: brand.ink,
                '&:hover': { backgroundColor: brand.white },
              }}
            >
              {t.hero.ctaMenu}
            </Button>
            <Button
              component={Link}
              href={localePath(lang, '/#find-us')}
              variant="outlined"
              sx={{
                color: brand.cream,
                borderColor: 'rgba(247,236,228,0.6)',
                '&:hover': {
                  borderColor: brand.cream,
                  backgroundColor: 'rgba(247,236,228,0.12)',
                },
              }}
            >
              {t.hero.ctaFind}
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
