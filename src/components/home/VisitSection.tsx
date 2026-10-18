import Image from 'next/image';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import WifiIcon from '@mui/icons-material/Wifi';
import DeckOutlinedIcon from '@mui/icons-material/DeckOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded';
import type { Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import type { PlaceDetails } from '@/server/places/googlePlaces';
import { FALLBACK_HOURS } from '@/features/order/lib/pickupTimes';
import { brand, radius, shadow } from '@/theme/brand';
import { Stars } from '@/components/marketing/Stars';
import { MAPS_LINK, WHATSAPP_HREF } from './links';
import { OpenNowPill } from './OpenNowPill';

/** Same order as `location.amenities`: dogs, wifi, terrace. */
const AMENITY_ICONS = [PetsOutlinedIcon, WifiIcon, DeckOutlinedIcon];

/**
 * "Come and see us": the terrace itself, with the live Google rating (and a
 * link to leave one) pinned to the photo, whether we are open right now, and the two ways to get here.
 * Rating, review count and hours are all live from Google Maps.
 */
export function VisitSection({
  t,
  lang,
  place,
}: {
  t: SiteContent;
  lang: Lang;
  place: PlaceDetails | null;
}) {
  const rating = place?.rating ?? null;
  const mapsUrl = place?.mapsUrl ?? MAPS_LINK;

  return (
    <Box
      id="visit"
      component="section"
      aria-labelledby="visit-title"
      sx={{ scrollMarginTop: { xs: 124, md: 136 }, backgroundColor: brand.rosePinkTint, overflow: 'hidden' }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 13 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
            gap: { xs: 6, md: 10 },
            alignItems: 'center',
          }}
        >
          {/* ── Words ─────────────────────────────────────────────────── */}
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            <OpenNowPill
              hours={place?.hours ?? FALLBACK_HOURS}
              lang={lang}
              openUntil={t.status.openUntil}
              opensAt={t.status.opensAt}
            />

            <Box>
              <Typography
                id="visit-title"
                variant="h2"
                translate="no"
                sx={{ fontSize: { xs: 'clamp(2.4rem, 11vw, 3.2rem)', md: '4rem' }, lineHeight: 1 }}
              >
                {t.location.title}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1.5, color: brand.ink70 }}>
                <PlaceOutlinedIcon aria-hidden sx={{ fontSize: 20, color: brand.rosePinkDeep }} />
                <Typography sx={{ fontSize: '1.0625rem' }} translate="no">
                  {t.location.town}
                </Typography>
              </Stack>
            </Box>

            <Stack
              component="ul"
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ m: 0, p: 0, listStyle: 'none' }}
              data-testid="amenities"
            >
              {t.location.amenities.map((label, i) => {
                const Icon = AMENITY_ICONS[i] ?? DeckOutlinedIcon;
                return (
                  <Box
                    component="li"
                    key={label}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      pl: 0.75,
                      pr: 1.75,
                      py: 0.75,
                      borderRadius: 999,
                      backgroundColor: brand.white,
                      fontWeight: 500,
                      fontSize: '0.9375rem',
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: brand.rosePinkTint,
                        color: brand.rosePinkDeep,
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </Box>
                    {label}
                  </Box>
                );
              })}
            </Stack>

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ pt: 1 }}>
              <Button
                component="a"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                size="large"
                startIcon={<DirectionsRoundedIcon />}
              >
                {t.location.directions}
              </Button>
              <Button
                component="a"
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="large"
                startIcon={<WhatsAppIcon />}
                sx={{
                  color: brand.ink,
                  borderColor: 'rgba(26,26,26,0.25)',
                  backgroundColor: brand.white,
                  '&:hover': { borderColor: brand.ink, backgroundColor: brand.white },
                }}
              >
                {t.location.whatsapp}
              </Button>
            </Stack>
          </Stack>

          {/* ── Picture: the terrace, with the rating on it ──────────── */}
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '4 / 5',
                borderRadius: `${radius.xl}px`,
                overflow: 'hidden',
                boxShadow: shadow.lift,
              }}
            >
              <Image
                src="/media/terrace.webp"
                alt={t.location.photoAlt}
                fill
                sizes="(max-width: 900px) 90vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            </Box>

            {/* The live Google rating, pinned to the photo, with the way to add one. */}
            {(rating !== null || place?.writeReviewUrl) && (
              <Box
                data-testid="rating-card"
                sx={{
                  position: 'absolute',
                  top: { xs: 16, md: 24 },
                  right: { xs: 12, md: 24 },
                  px: { xs: 2, md: 2.5 },
                  py: { xs: 1.5, md: 2 },
                  borderRadius: `${radius.lg}px`,
                  backgroundColor: brand.white,
                  boxShadow: shadow.lift,
                  color: brand.ink,
                }}
              >
                {rating !== null && (
                  <Box
                    component="a"
                    href={place?.reviewsUrl ?? mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Typography
                        data-testid="google-rating"
                        sx={{
                          fontFamily: 'var(--font-poppins)',
                          fontWeight: 600,
                          fontSize: { xs: '2rem', md: '2.5rem' },
                          lineHeight: 1,
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {rating.toFixed(1)}
                      </Typography>
                      <Stars value={rating} size={16} label={`${rating.toFixed(1)} / 5`} />
                    </Stack>
                    <Typography data-testid="google-review-count" sx={{ mt: 0.75, fontSize: '0.8125rem', color: brand.ink70 }}>
                      {place?.total ? `${place.total} ${t.reviews.count}` : t.reviews.read}
                    </Typography>
                  </Box>
                )}
                {place?.writeReviewUrl && (
                  <Box
                    component="a"
                    href={place.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'block',
                      mt: rating !== null ? 1.25 : 0,
                      pt: rating !== null ? 1.25 : 0,
                      borderTop: rating !== null ? `1px solid ${brand.ink12}` : 'none',
                      color: brand.rosePinkDeep,
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      textUnderlineOffset: 4,
                      '&:hover': { color: brand.ink },
                    }}
                  >
                    {t.reviews.write}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
