import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { clubOfferLine, type ClubOffer } from '@/features/club/agentClub';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';

/**
 * The coffee club on the home page: its name, what it gives and costs (from the
 * Business Agent), and the way to its page. The page isn't asked for it when the
 * café has no club.
 */
export function ClubBand({ t, lang, club }: { t: SiteContent; lang: Lang; club: ClubOffer }) {
  return (
    <Box component="section" aria-labelledby="club-band-title" data-testid="club-band" sx={{ pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 3,
            backgroundColor: brand.lilacTint,
            borderRadius: `${radius.xl}px`,
            p: { xs: 3, md: 6 },
          }}
        >
          <Box>
            <Typography id="club-band-title" variant="h2" sx={{ mb: 1 }}>
              {club.name}
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.3125rem' }, color: brand.ink70 }}>
              {clubOfferLine(club, t.club, lang)}
            </Typography>
          </Box>
          <Button
            component={Link}
            href={localePath(lang, '/club')}
            variant="contained"
            size="large"
            sx={{ flexShrink: 0 }}
          >
            {t.club.teaserCta}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
