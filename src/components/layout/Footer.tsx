import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import logo from '@/assets/logo.png';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { groupOpeningHours } from '@/shared/lib/openingHours';
import { INSTAGRAM_URL, TIKTOK_URL } from '@/shared/lib/social';
import { EMAIL, MAPS_LINK, WHATSAPP_HREF } from '@/components/home/links';
import { brand } from '@/theme/brand';

/**
 * On every page: the opening hours (live from Google Maps, with the known week
 * as fallback), where we are, how to reach us. Server-rendered, no JavaScript.
 * Cream, because the roundel is only approved on cream, white or limewash.
 */
export async function Footer({ t, lang }: { t: SiteContent; lang: Lang }) {
  const place = await getPlaceDetails(lang);
  const liveHours = place?.hours
    ? groupOpeningHours(place.hours, lang, { closed: t.footer.closed, allDay: t.footer.allDay })
    : [];
  const hours = liveHours.length > 0 ? liveHours : t.footer.hours;

  const pages = [
    { label: t.nav.menu, href: localePath(lang, '/order') },
    { label: t.nav.shop, href: localePath(lang, '/shop') },
    { label: t.nav.story, href: localePath(lang, '/about') },
    { label: t.nav.account, href: localePath(lang, '/account') },
  ];
  const contact = [
    { label: t.location.address, href: place?.mapsUrl ?? MAPS_LINK },
    { label: t.location.whatsapp, href: WHATSAPP_HREF },
    { label: EMAIL, href: `mailto:${EMAIL}` },
    { label: t.social.instagram, href: INSTAGRAM_URL },
    { label: t.social.tiktok, href: TIKTOK_URL },
  ];
  const link = {
    color: 'inherit',
    textDecoration: 'none',
    '&:hover': { color: brand.rosePinkDeep, textDecoration: 'underline', textUnderlineOffset: 4 },
  } as const;

  return (
    <Box component="footer" sx={{ backgroundColor: brand.cream, color: brand.ink, mt: 'auto', borderTop: `1px solid ${brand.ink12}` }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'auto 1fr 1fr 1fr' },
            columnGap: { md: 8 },
            rowGap: 5,
          }}
        >
          <Box sx={{ '& img': { height: 64, width: 'auto' } }}>
            <Image src={logo} alt="Easy Beans Coffee" width={64} height={64} />
          </Box>

          <Box>
            <Typography component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t.footer.hoursTitle}
            </Typography>
            <Box
              component="dl"
              data-testid="opening-hours"
              data-source={liveHours.length > 0 ? 'google' : 'fallback'}
              sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5 }}
            >
              {hours.map((slot) => (
                <Box key={slot.label} data-testid="opening-hours-row" sx={{ display: 'contents' }}>
                  <Box component="dt" sx={{ color: brand.ink70 }}>{slot.label}</Box>
                  <Box component="dd" sx={{ m: 0, fontVariantNumeric: 'tabular-nums' }}>{slot.value}</Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t.footer.contactTitle}
            </Typography>
            <Stack spacing={0.5}>
              {contact.map((item) => (
                <Box key={item.href} component="a" href={item.href} target={item.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" sx={link}>
                  {item.label}
                </Box>
              ))}
            </Stack>
          </Box>

          <Box component="nav" aria-label="Easy Beans">
            <Stack spacing={0.5} sx={{ mt: { md: 4.5 } }}>
              {pages.map((item) => (
                <Box key={item.href} component={Link} href={item.href} sx={link}>
                  {item.label}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        <Typography variant="caption" component="p" translate="no" sx={{ mt: { xs: 6, md: 8 }, color: brand.ink45 }}>
          {t.footer.rights}
        </Typography>
      </Container>
    </Box>
  );
}
