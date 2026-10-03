import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';
import { LazyVideo } from './client/LazyVideo';

/**
 * The signature move: cold drinks sealed in a can at the counter.
 *
 * The claim is "in front of you", so the proof is the film of it happening
 * rather than a photograph of the finished can — a still can only show the
 * result, which is the part nobody doubts.
 */
export function CanSection({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Box sx={{ backgroundColor: brand.rosePinkTint }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 5, md: 9 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" component="p" sx={{ color: brand.ink, mb: 2 }}>
              {t.can.eyebrow}
            </Typography>
            <Typography variant="h2" sx={{ maxWidth: '14ch', mb: 3, textWrap: 'balance' }}>
              {t.can.headline}
            </Typography>
            <Typography sx={{ maxWidth: '52ch', mb: 4, color: brand.ink }}>
              {t.can.body}
            </Typography>
            <Button
              component={Link}
              href={localePath(lang, '/order')}
              variant="contained"
              color="primary"
            >
              {t.can.cta}
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5} alignItems="center">
              <LazyVideo
                src="/media/ube-making.mp4"
                poster="/media/ube-can.webp"
                label={t.can.caption}
                playLabel={t.media.play}
                pauseLabel={t.media.pause}
                maxWidth={340}
              />
              <Typography
                variant="body2"
                sx={{ color: brand.ink70, textAlign: 'center', maxWidth: '32ch' }}
              >
                {t.can.caption}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
