import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { clubMoney, clubOfferLine } from '@/features/club/agentClub';
import { JoinClubButton } from '@/features/club/client/JoinClubButton';
import { LANGS, isLang, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getAgentClub } from '@/server/businessAgent/clubFeed';
import { brand, radius, shadow } from '@/theme/brand';

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.nav.club,
    description: t.club.metaDescription,
    alternates: {
      canonical: `/${lang}/club`,
      languages: { es: '/es/club', en: '/en/club' },
    },
  };
}

/**
 * Selling the coffee club: what it gives and costs, how it works, and the way to
 * join. The offer is the Business Agent's (re-read every minute or so); with no
 * club there, or the agent never read, the page says it isn't available.
 */
export default async function ClubPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);
  const copy = t.club;
  const club = (await getAgentClub())?.club;

  if (!club) {
    return (
      <Container maxWidth="sm" data-testid="club-unavailable" sx={{ py: { xs: 8, md: 14 }, textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontSize: 'clamp(2rem, 6vw, 3rem)', mb: 2 }}>
          {copy.unavailable}
        </Typography>
        <Typography sx={{ color: brand.ink70, mb: 4 }}>{copy.unavailableBody}</Typography>
        <Button component={Link} href={localePath(lang, '/order')} variant="outlined">
          {copy.unavailableCta}
        </Button>
      </Container>
    );
  }

  const n = club.coffees_per_week;
  const steps = copy.steps.map((step, i) =>
    i === copy.steps.length - 1 && n > 1 ? { ...step, body: copy.freeMany.replace('{n}', String(n)) } : step,
  );

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 9, md: 14 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: { xs: 5, md: 8 }, alignItems: 'center' }}>
        <Stack spacing={{ xs: 2.5, md: 3 }} alignItems="flex-start" data-testid="club-offer">
          <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep }}>
            {copy.eyebrow}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: 'clamp(2.5rem, 11vw, 3.75rem)', md: 'clamp(3.5rem, 5.5vw, 5rem)' }, lineHeight: 1, letterSpacing: '-0.035em' }}>
            {club.name}
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.375rem', md: '1.75rem' }, fontWeight: 600, lineHeight: 1.3 }}>
            {clubOfferLine(club, copy, lang)}
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70, maxWidth: '40ch' }}>
            {copy.lead}
          </Typography>

          {club.taking_members ? (
            <JoinClubButton resumeAfterSignIn />
          ) : (
            <Typography data-testid="club-closed" sx={{ fontWeight: 500, backgroundColor: brand.white, borderRadius: `${radius.pill}px`, px: 2.5, py: 1.25 }}>
              {copy.closed}
            </Typography>
          )}

          <Box sx={{ color: brand.ink70, fontSize: '0.875rem' }}>
            {club.max_value !== null && (
              <Typography sx={{ fontSize: 'inherit' }}>
                {copy.cap.replace('{amount}', clubMoney(club.max_value, club.currency, lang))}
              </Typography>
            )}
            <Typography sx={{ fontSize: 'inherit' }}>{copy.cancel}</Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', aspectRatio: '3 / 4', width: '100%', maxWidth: 420, mx: 'auto', borderRadius: `${radius.xl}px`, overflow: 'hidden', backgroundColor: brand.white }}>
          <Image
            src="/media/drinks/cappuccino/hot-takeaway.webp"
            alt={copy.photoAlt}
            fill
            priority
            sizes="(max-width: 900px) 90vw, 420px"
            style={{ objectFit: 'cover' }}
          />
        </Box>
      </Box>

      <Box component="section" aria-labelledby="club-steps-title" sx={{ mt: { xs: 8, md: 12 } }}>
        <Typography id="club-steps-title" variant="h2" sx={{ mb: { xs: 3, md: 4 } }}>
          {copy.stepsTitle}
        </Typography>
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {steps.map((step, i) => (
            <Box component="li" key={step.title} data-testid="club-step" sx={{ backgroundColor: brand.white, borderRadius: `${radius.xl}px`, boxShadow: shadow.soft, p: { xs: 3, md: 4 } }}>
              <Box aria-hidden sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', backgroundColor: brand.rosePinkTint, color: brand.rosePinkDeep, fontWeight: 600, mb: 2 }}>
                {i + 1}
              </Box>
              <Typography variant="h4" component="h3" sx={{ mb: 0.75 }}>
                {step.title}
              </Typography>
              <Typography sx={{ color: brand.ink70 }}>{step.body}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
