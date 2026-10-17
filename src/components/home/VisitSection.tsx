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
import type { SiteContent } from '@/i18n/content/en';
import type { PlaceDetails } from '@/server/places/googlePlaces';
import { brand, radius } from '@/theme/brand';
import { Stars } from '@/components/marketing/Stars';
import { MAPS_LINK, WHATSAPP_HREF } from './links';

/** Same order as `location.amenities`: dogs, wifi, terrace. */
const AMENITY_ICONS = [PetsOutlinedIcon, WifiIcon, DeckOutlinedIcon];

/**
 * Where we are and what people say, both live from Google Maps. Opening hours
 * sit in the footer, on every page; this block answers "how do I get there".
 */
export function VisitSection({ t, place }: { t: SiteContent; place: PlaceDetails | null }) {
  const rating = place?.rating ?? null;
  const mapsUrl = place?.mapsUrl ?? MAPS_LINK;

  return (
    <Box id="visit" component="section" aria-labelledby="visit-title" sx={{ scrollMarginTop: 88, backgroundColor: brand.matchaTint }}>
      <Container maxWidth="lg" sx={{ py: { xs: 9, md: 14 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 5, md: 10 }, alignItems: 'center' }}>
          <Box sx={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: `${radius.xl}px`, overflow: 'hidden', order: 2 }}>
            <Image src="/media/strawberry-matcha-can.webp" alt={t.location.photoAlt} fill sizes="(max-width: 900px) 100vw, 45vw" style={{ objectFit: 'cover', objectPosition: 'center 60%' }} />
          </Box>

          <Stack spacing={{ xs: 3, md: 4 }} sx={{ order: 1 }}>
            <Box>
              <Typography id="visit-title" variant="h2">
                {t.location.title}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: '1.125rem', color: brand.ink70 }}>{t.location.town}</Typography>
            </Box>

            {rating !== null && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    data-testid="google-rating"
                    sx={{ fontFamily: 'var(--font-poppins)', fontWeight: 600, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.03em' }}
                  >
                    {rating.toFixed(1)}
                  </Typography>
                  <Stars value={rating} size={20} label={`${rating.toFixed(1)} / 5`} />
                </Stack>
                <Typography data-testid="google-review-count" sx={{ mt: 1, color: brand.ink70 }}>
                  {place?.total ? `${place.total} ${t.reviews.count}` : null}
                </Typography>
                <Stack direction="row" spacing={2.5} sx={{ mt: 1.5 }}>
                  <Box component="a" href={place?.reviewsUrl ?? mapsUrl} target="_blank" rel="noopener noreferrer" sx={{ color: brand.rosePinkDeep, fontWeight: 500, textUnderlineOffset: 4 }}>
                    {t.reviews.read}
                  </Box>
                  <Box component="a" href={place?.writeReviewUrl ?? mapsUrl} target="_blank" rel="noopener noreferrer" sx={{ color: brand.rosePinkDeep, fontWeight: 500, textUnderlineOffset: 4 }}>
                    {t.reviews.write}
                  </Box>
                </Stack>
              </Box>
            )}

            <Stack component="ul" direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ m: 0, p: 0, listStyle: 'none' }} data-testid="amenities">
              {t.location.amenities.map((label, i) => {
                const Icon = AMENITY_ICONS[i] ?? DeckOutlinedIcon;
                return (
                  <Box
                    component="li"
                    key={label}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.75, py: 0.875, borderRadius: 999, backgroundColor: brand.white, fontWeight: 500, fontSize: '0.9375rem' }}
                  >
                    <Icon aria-hidden sx={{ fontSize: 19, color: brand.matchaGreenDeep }} />
                    {label}
                  </Box>
                );
              })}
            </Stack>

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
              <Button component="a" href={mapsUrl} target="_blank" rel="noopener noreferrer" variant="contained">
                {t.location.directions}
              </Button>
              <Button
                component="a"
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                sx={{ color: brand.ink, borderColor: 'rgba(26,26,26,0.25)', backgroundColor: brand.white, '&:hover': { borderColor: brand.ink, backgroundColor: brand.white } }}
              >
                {t.location.whatsapp}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
