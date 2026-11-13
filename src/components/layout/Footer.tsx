import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import logo from '@/assets/logo.png';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { getCafeDetails } from '@/server/businessAgent/detailsFeed';
import { groupOpeningHours } from '@/shared/lib/openingHours';
import { brand } from '@/theme/brand';

/** "24 Dec", or "24 – 26 Dec" for a closure of several days, in the page's language. */
function closureDates(from: string, to: string, lang: Lang): string {
  const format = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const date = (iso: string) => new Date(`${iso}T12:00:00Z`);
  return from === to ? format.format(date(from)) : format.formatRange(date(from), date(to));
}

/**
 * On every page: the opening hours, the days we're closed soon, where we are
 * and how to reach us, all from the Business Agent (where they're changed;
 * Google Maps shows the same). Server-rendered, no JavaScript.
 * Cream, because the roundel is only approved on cream, white or limewash.
 */
export async function Footer({ t, lang }: { t: SiteContent; lang: Lang }) {
  const details = await getCafeDetails();
  const liveHours = groupOpeningHours(details.week, lang, { closed: t.footer.closed, allDay: t.footer.allDay });
  const hours = liveHours.length > 0 ? liveHours : t.footer.hours;
  // The closures of the next two weeks, so nobody walks to a shut door.
  const soon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const closures = details.closures.filter((c) => c.from <= soon).slice(0, 3);

  const pages = [
    { label: t.nav.menu, href: localePath(lang, '/order') },
    { label: t.nav.shop, href: localePath(lang, '/shop') },
    { label: t.nav.story, href: localePath(lang, '/about') },
    { label: t.nav.account, href: localePath(lang, '/account') },
  ];
  // Only what the café has filled in, in the agent.
  const contact = [
    details.address ? { label: details.address, href: details.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}` } : null,
    details.whatsappUrl ? { label: t.location.whatsapp, href: details.whatsappUrl } : null,
    details.phone && !details.whatsapp ? { label: details.phone, href: `tel:${details.phone.replace(/[^\d+]/g, '')}` } : null,
    details.email ? { label: details.email, href: `mailto:${details.email}` } : null,
    details.instagram ? { label: t.social.instagram, href: details.instagram.url } : null,
    details.tiktok ? { label: t.social.tiktok, href: details.tiktok.url } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);
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
              data-source={liveHours.length > 0 ? details.source : 'fallback'}
              sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5 }}
            >
              {hours.map((slot) => (
                <Box key={slot.label} data-testid="opening-hours-row" sx={{ display: 'contents' }}>
                  <Box component="dt" sx={{ color: brand.ink70 }}>{slot.label}</Box>
                  <Box component="dd" sx={{ m: 0, fontVariantNumeric: 'tabular-nums' }}>{slot.value}</Box>
                </Box>
              ))}
            </Box>
            {closures.length > 0 && (
              <Box component="ul" data-testid="closures" sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none', color: brand.rosePinkDeep }}>
                {closures.map((c) => (
                  <Box component="li" key={`${c.from}-${c.to}`} data-testid="closure" sx={{ fontSize: '0.875rem' }}>
                    {t.footer.closedOn.replace('{dates}', closureDates(c.from, c.to, lang))}
                    <Box component="span" sx={{ color: brand.ink70 }}>{` · ${c.reason}`}</Box>
                  </Box>
                ))}
              </Box>
            )}
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
