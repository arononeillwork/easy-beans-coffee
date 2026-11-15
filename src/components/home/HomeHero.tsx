import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';
import { FilmFrame } from './FilmFrame';

/**
 * Headline, one line and three ways in — beside the film it describes.
 *
 * The whole hero is sized to the screen it lands on: the banner and header
 * above it take HEADER px, and the hero is exactly the rest of the viewport.
 * The headline scales with the viewport's *height* (not its width) and the film
 * fills whatever height is left, so on a short laptop window the buttons are
 * still on the first screen rather than a scroll away.
 */
const HEADER = { xs: 124, md: 136 };

export function HomeHero({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Container
      maxWidth="lg"
      sx={{
        height: {
          xs: `calc(100dvh - ${HEADER.xs}px)`,
          md: `calc(100dvh - ${HEADER.md}px)`,
        },
        minHeight: { xs: 520, md: 420 },
        // A very tall window should not stretch the hero into a poster.
        maxHeight: { md: 760 },
        display: 'flex',
        alignItems: 'stretch',
        py: { xs: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          width: '100%',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gridTemplateRows: { xs: 'auto minmax(0, 1fr)', md: 'minmax(0, 1fr)' },
          gap: { xs: 2.5, md: 6 },
          alignItems: { xs: 'start', md: 'center' },
        }}
      >
        <Stack spacing={{ xs: 2, md: 'clamp(1rem, 3vh, 1.75rem)' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: {
                xs: 'clamp(2.75rem, min(15vw, 9vh), 5rem)',
                md: 'clamp(3.25rem, min(9vw, 15vh), 8.75rem)',
              },
              lineHeight: 0.9,
              letterSpacing: '-0.045em',
            }}
          >
            {t.hero.lines.map((line, i) => (
              <Box component="span" key={line} sx={{ display: 'block' }}>
                {line}
                {i < t.hero.lines.length - 1 ? ' ' : ''}
              </Box>
            ))}
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70, maxWidth: '38ch' }}>
            {t.hero.sub}
          </Typography>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Button component={Link} href={localePath(lang, '/order')} variant="contained">
              {t.hero.ctaOrder}
            </Button>
            <Button
              component={Link}
              href={localePath(lang, '/order')}
              variant="contained"
              sx={{ backgroundColor: brand.roseWash, color: brand.ink, '&:hover': { backgroundColor: brand.rosePinkTint } }}
            >
              {t.hero.ctaMenu}
            </Button>
            <Button
              component={Link}
              href={localePath(lang, '/#visit')}
              variant="outlined"
              sx={{ color: brand.ink, borderColor: 'rgba(26,26,26,0.25)', '&:hover': { borderColor: brand.ink, backgroundColor: 'transparent' } }}
            >
              {t.hero.ctaFind}
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: 'relative',
            // Fills the height the hero has left; the width follows from the ratio.
            height: '100%',
            width: { xs: '100%', md: 'auto' },
            aspectRatio: { xs: 'auto', md: '3 / 4' },
            minHeight: 0,
            borderRadius: `${radius.xl}px`,
            overflow: 'hidden',
          }}
        >
          <FilmFrame
            src="/media/hero-film.mp4"
            poster="/media/hero-poster.webp"
            label={t.hero.filmLabel}
          />
        </Box>
      </Box>
    </Container>
  );
}
