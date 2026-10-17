import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InstagramIcon from '@mui/icons-material/Instagram';
import type { SiteContent } from '@/i18n/content/en';
import { INSTAGRAM_URL } from '@/shared/lib/social';
import { brand, radius } from '@/theme/brand';
import { LazyVideo } from './LazyVideo';

/** The café on a normal day — the second film, loaded only as it nears the screen. */
export function CafeFilm({ t }: { t: SiteContent }) {
  return (
    <Box component="section" aria-labelledby="film-title" sx={{ pb: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            backgroundColor: brand.roseWash,
            borderRadius: `${radius.xl}px`,
            p: { xs: 3, sm: 5, md: 7 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
            gap: { xs: 4, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
            <LazyVideo
              src="/media/cafe-tuesday.mp4"
              poster="/media/terrace.webp"
              label={t.video.label}
              playLabel={t.media.play}
              pauseLabel={t.media.pause}
              maxWidth={360}
            />
          </Box>
          <Box>
            <Typography id="film-title" variant="h2" sx={{ fontSize: { xs: 'clamp(2rem, 9vw, 2.75rem)', md: 'clamp(2.75rem, 4.4vw, 4rem)' }, maxWidth: '13ch' }}>
              {t.video.headline}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: { md: '1.125rem' }, color: brand.ink70, maxWidth: '38ch' }}>{t.video.body}</Typography>
            <Button
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<InstagramIcon />}
              sx={{ mt: 4 }}
            >
              {t.video.cta}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
