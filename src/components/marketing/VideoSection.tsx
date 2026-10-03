import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import InstagramIcon from '@mui/icons-material/Instagram';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';
import { LazyVideo } from './client/LazyVideo';

/**
 * "One small room, all day long." — vertical café film from the shoot.
 *
 * Held inside a rose-wash panel rather than sitting loose on the cream: the
 * film is a 9/16 crop, and without a ground behind it the column of video
 * reads as a hole in the page.
 */
export function VideoSection({ t }: { t: SiteContent }) {
  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            backgroundColor: brand.roseWash,
            borderRadius: `${radius.lg}px`,
            p: { xs: 3, sm: 5, md: 6 },
          }}
        >
          <Grid container spacing={{ xs: 4, md: 7 }} alignItems="center">
            <Grid
              size={{ xs: 12, md: 5 }}
              sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}
            >
              <LazyVideo
                src="/media/cafe-tuesday.mp4"
                poster="/media/terrace.webp"
                label={t.video.headline}
                playLabel={t.media.play}
                pauseLabel={t.media.pause}
                maxWidth={340}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h6" component="p" sx={{ color: brand.ink45, mb: 2 }}>
                {t.video.eyebrow}
              </Typography>
              <Typography variant="h2" sx={{ maxWidth: '18ch', mb: 3, textWrap: 'balance' }}>
                {t.video.headline}
              </Typography>
              <Typography sx={{ mb: 4, maxWidth: '46ch', color: brand.ink }}>
                {t.video.body}
              </Typography>
              <Button
                href="https://www.instagram.com/easy.beans.coffee"
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="primary"
                startIcon={<InstagramIcon />}
              >
                {t.video.cta}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
