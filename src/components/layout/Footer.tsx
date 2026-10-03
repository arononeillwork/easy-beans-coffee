import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InstagramIcon from '@mui/icons-material/Instagram';
import logo from '@/assets/logo.png';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { groupOpeningHours } from '@/shared/lib/openingHours';
import { INSTAGRAM_URL, TIKTOK_URL } from '@/shared/lib/social';
import { brand, radius } from '@/theme/brand';

const EMAIL = 'easybeanscafe@gmail.com';

/**
 * Server component through and through — the footer ships no JavaScript.
 *
 * Opening hours come from the Google Maps listing so they follow whatever is
 * changed there, and fall back to the dictionary when Places is not configured
 * or is unreachable.
 *
 * Cream, not ink: the logo lockup is only approved on cream, white or
 * limewash, so a dark footer would force an invert that the mark forbids.
 */
export async function Footer({ t, lang }: { t: SiteContent; lang: Lang }) {
  const place = await getPlaceDetails(lang);
  const liveHours = place?.hours
    ? groupOpeningHours(place.hours, lang, { closed: t.footer.closed, allDay: t.footer.allDay })
    : [];
  const hours = liveHours.length > 0 ? liveHours : t.footer.hours;

  // The menu and the ordering page are one page, so every drink link lands there.
  const drinkLinks = [
    { label: t.menuPage.eyebrow, href: localePath(lang, '/order') },
    // The five explainers upstairs, each pointing at where you can order it.
    ...t.education.items.map((item) => ({
      label: item.name,
      href: localePath(lang, '/order'),
    })),
  ];

  return (
    <Box component="footer" sx={{ backgroundColor: brand.cream, color: brand.ink, mt: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={{ xs: 5, md: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Roundel alone, as in the header — it carries the wordmark
                itself, so setting "Easy Beans Coffee" beside it doubles up. */}
            <Box sx={{ mb: 2.5, '& img': { height: 64, width: 'auto' } }}>
              <Image src={logo} alt="Easy Beans Coffee" width={64} height={64} />
            </Box>

            <Typography variant="h4" sx={{ maxWidth: '14ch', mb: 2 }}>
              {t.footer.orderLine}
            </Typography>
            <Typography variant="body2" sx={{ color: brand.ink70, maxWidth: '42ch', mb: 3 }}>
              {t.footer.orderBody}
            </Typography>

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
              <Button component={Link} href={localePath(lang, '/order')} variant="contained" size="small">
                {t.footer.orderCta}
              </Button>
              <Chip
                label={t.delivery.badge}
                size="small"
                variant="outlined"
                sx={{ borderStyle: 'dashed', borderColor: brand.ink12, color: brand.ink70 }}
              />
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
              <SocialCircle href={INSTAGRAM_URL} label={`${t.social.instagram} ${t.social.handle}`}>
                <InstagramIcon fontSize="small" />
              </SocialCircle>
              <SocialCircle href={TIKTOK_URL} label={`${t.social.tiktok} ${t.social.tiktokHandle}`}>
                <TikTokIcon size={18} />
              </SocialCircle>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack alignItems="center" spacing={1.5} sx={{ height: '100%', justifyContent: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 160,
                  height: 200,
                  overflow: 'hidden',
                  borderRadius: `${radius.lg}px`,
                }}
              >
                <Image
                  src="/media/hero-can.webp"
                  alt=""
                  fill
                  sizes="160px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="h6" component="p" sx={{ color: brand.ink45 }}>
                {t.footer.canCaption}
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
              {t.footer.drinksTitle}
            </Typography>
            <Stack spacing={1.25}>
              {drinkLinks.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
              {t.footer.brandTitle}
            </Typography>
            <Stack spacing={1.25}>
              <FooterLink href={localePath(lang, '/about')} label={t.nav.story} />
              <FooterLink href={`${localePath(lang, '/')}#know`} label={t.footer.learn} />
              <FooterLink href={`mailto:${EMAIL}`} label={EMAIL} />
              <FooterLink href={INSTAGRAM_URL} label={t.social.instagram} external />
              <FooterLink href={TIKTOK_URL} label={t.social.tiktok} external />
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 4, md: 5 } }} />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1.5, md: 4 }}
          alignItems={{ md: 'baseline' }}
        >
          <Typography variant="h6" component="p" sx={{ color: brand.ink45, flexShrink: 0 }}>
            {t.footer.hoursTitle}
          </Typography>
          <Stack direction="row" spacing={{ xs: 2, md: 4 }} useFlexGap flexWrap="wrap">
            {hours.map((slot) => (
              <Typography key={slot.label} variant="body2" sx={{ color: brand.ink70 }}>
                <Box component="span" sx={{ fontWeight: 500, color: brand.ink }}>
                  {slot.label}
                </Box>{' '}
                {slot.value}
              </Typography>
            ))}
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          sx={{ mt: { xs: 4, md: 5 }, color: brand.ink45, fontSize: '0.75rem' }}
        >
          <Typography variant="caption">{t.footer.rights}</Typography>
        </Stack>
      </Container>
    </Box>
  );
}

function SocialCircle({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: `${radius.pill}px`,
        border: `1px solid ${brand.ink12}`,
        color: brand.ink,
        transition: 'background-color 150ms, border-color 150ms',
        '&:hover': { backgroundColor: brand.white, borderColor: brand.rosePink },
      }}
    >
      {children}
    </Box>
  );
}

function FooterLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <Box
      component={Link}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      sx={{
        color: brand.ink70,
        textDecoration: 'none',
        fontSize: '0.9rem',
        // The email address is longer than a narrow footer column.
        overflowWrap: 'anywhere',
        '&:hover': { color: brand.rosePinkDeep },
      }}
    >
      {label}
    </Box>
  );
}
