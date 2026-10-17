import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import type { DayHours } from '@/shared/lib/openingHours';
import { brand, radius } from '@/theme/brand';
import { FilmFrame } from './FilmFrame';
import { LiveStatus } from './LiveStatus';

/**
 * The headline at full volume beside the film it describes. The only line of
 * status is live: open or closed right now, from the Google Maps hours.
 */
export function HomeHero({ t, lang, hours }: { t: SiteContent; lang: Lang; hours: DayHours[] }) {
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 8, md: 12 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          gap: { xs: 5, md: 8 },
          alignItems: 'end',
        }}
      >
        <Stack spacing={{ xs: 3, md: 4 }} sx={{ pb: { md: 2 } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 'clamp(3.5rem, 17vw, 5.5rem)', md: 'clamp(5.5rem, 9vw, 8.75rem)' },
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
          <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70, maxWidth: '36ch' }}>
            {t.hero.sub}
          </Typography>
          <LiveStatus hours={hours} />
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Button component={Link} href={localePath(lang, '/order')} variant="contained">
              {t.hero.ctaOrder}
            </Button>
            <Button
              component={Link}
              href={localePath(lang, '/#visit')}
              variant="outlined"
              sx={{ color: brand.ink, borderColor: brand.ink12, '&:hover': { borderColor: brand.ink, backgroundColor: 'transparent' } }}
            >
              {t.hero.ctaFind}
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: 'relative',
            aspectRatio: { xs: '4 / 5', md: '3 / 4' },
            borderRadius: `${radius.xl}px`,
            overflow: 'hidden',
          }}
        >
          <FilmFrame
            src="/media/hero-film.mp4"
            poster="/media/hero-poster.webp"
            label={t.hero.filmLabel}
            playLabel={t.media.play}
            pauseLabel={t.media.pause}
          />
        </Box>
      </Box>
    </Container>
  );
}
