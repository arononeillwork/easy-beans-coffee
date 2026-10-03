import Image from 'next/image';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import WifiIcon from '@mui/icons-material/Wifi';
import DeckOutlinedIcon from '@mui/icons-material/DeckOutlined';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';

const MAPS_EMBED =
  'https://www.google.com/maps?q=Easy+Beans+Coffee,+C.+Pizarro+8,+29670+San+Pedro+de+Alc%C3%A1ntara,+M%C3%A1laga&output=embed';
const MAPS_LINK =
  'https://www.google.com/maps/search/?api=1&query=Easy+Beans+Coffee+C.+Pizarro+8+San+Pedro+de+Alc%C3%A1ntara';
const WHATSAPP_HREF = 'https://wa.me/34695415335';

/** Positional — the copy declares the amenities, this fixes their icons. */
const AMENITY_ICONS = [PetsOutlinedIcon, WifiIcon, DeckOutlinedIcon];

/**
 * Where to find the café. The terrace photograph does the persuading and the
 * map does the navigating, so both are here: the photo answers "is this the
 * kind of place I want to sit", the embed answers "how do I get there".
 */
export function LocationSection({ t }: { t: SiteContent }) {
  return (
    <Box id="find-us" sx={{ backgroundColor: brand.roseWash, scrollMarginTop: 80 }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: { xs: 260, md: 420 },
                overflow: 'hidden',
                borderRadius: `${radius.lg}px`,
              }}
            >
              <Image
                src="/media/terrace.webp"
                alt={t.location.photoAlt}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" component="p" sx={{ color: brand.ink, mb: 2 }}>
              {t.location.eyebrow}
            </Typography>
            <Typography variant="h2" sx={{ maxWidth: '16ch', mb: 3, textWrap: 'balance' }}>
              {t.location.headline}
            </Typography>
            <Typography sx={{ maxWidth: '52ch', mb: 3, color: brand.ink, whiteSpace: 'pre-line' }}>
              {t.location.body}
            </Typography>
            <Typography variant="body2" sx={{ color: brand.ink70, mb: 3 }}>
              {t.location.address}
            </Typography>

            <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ mb: 4 }}>
              {t.location.amenities.map((amenity, i) => {
                const Icon = AMENITY_ICONS[i];
                return (
                  <Chip
                    key={amenity}
                    icon={Icon ? <Icon /> : undefined}
                    label={amenity}
                    sx={{
                      backgroundColor: brand.white,
                      color: brand.ink,
                      fontWeight: 500,
                      border: `1px solid ${brand.ink12}`,
                      '& .MuiChip-icon': { color: brand.rosePinkDeep, fontSize: 18 },
                    }}
                  />
                );
              })}
            </Stack>

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
              <Button
                href={MAPS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="primary"
                startIcon={<PlaceOutlinedIcon />}
              >
                {t.location.directions}
              </Button>
              <Button
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                sx={{
                  color: brand.ink,
                  borderColor: brand.ink,
                  '&:hover': { borderColor: brand.ink, backgroundColor: brand.ink06 },
                }}
              >
                {t.location.whatsapp}
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Box
          component="iframe"
          src={MAPS_EMBED}
          title={t.location.mapTitle}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{
            mt: { xs: 4, md: 7 },
            width: '100%',
            height: { xs: 260, md: 320 },
            border: 0,
            display: 'block',
            borderRadius: `${radius.lg}px`,
          }}
        />
      </Container>
    </Box>
  );
}
