import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';

/** Photography per card, in the order the copy declares them. */
const PHOTOS = [
  '/media/strawberry-matcha-can.webp',
  '/media/ube-latte.webp',
  '/media/iced-can-hand.webp',
];

/** Three signature drinks, each a door into the menu. */
export function DrinkCardsSection({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 3, md: 3.5 },
          }}
        >
          {t.drinkCards.map((card, i) => (
            <Box
              key={card.title}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: `${radius.lg}px`,
                overflow: 'hidden',
                backgroundColor: brand.white,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: 280,
                  overflow: 'hidden',
                  backgroundColor: brand.roseWash,
                }}
              >
                <Image
                  src={PHOTOS[i]}
                  alt={card.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.25, flexGrow: 1 }}>
                <Typography variant="h5">{card.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {card.body}
                </Typography>
                <Box
                  component={Link}
                  href={localePath(lang, card.href)}
                  sx={{
                    alignSelf: 'flex-start',
                    mt: 0.5,
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: brand.rosePinkDeep,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${brand.rosePink}`,
                    '&:hover': { color: brand.ink, borderBottomColor: brand.ink },
                  }}
                >
                  {card.cta}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
