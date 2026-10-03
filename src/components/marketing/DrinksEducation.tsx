import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import SpaIcon from '@mui/icons-material/Spa';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { localePath, type Lang } from '@/i18n/config';
import { DRINK_ALLERGENS, type DrinkId } from '@/i18n/allergens';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius, shadow } from '@/theme/brand';
import { AllergenChips } from './AllergenChips';
import { SectionHeading } from './SectionHeading';

/**
 * One badge colour per drink, drawn from the five. Ube and Açaí are the two
 * that people ask about at the counter, so they get the two colours that are
 * not pink — they are the ones the eye lands on first.
 */
const BADGES: Record<DrinkId, { icon: typeof LocalCafeIcon; bg: string; fg: string }> = {
  coffee: { icon: LocalCafeIcon, bg: brand.rosePinkDeep, fg: brand.white },
  matcha: { icon: EnergySavingsLeafIcon, bg: brand.matchaGreen, fg: brand.white },
  ube: { icon: BubbleChartIcon, bg: brand.ubeLilac, fg: brand.ink },
  acai: { icon: SpaIcon, bg: brand.rosePinkDeep, fg: brand.white },
  chai: { icon: LocalDrinkIcon, bg: brand.rosePink, fg: brand.ink },
};

export function DrinksEducation({ t, lang }: { t: SiteContent; lang: Lang }) {
  return (
    <Box id="know" sx={{ backgroundColor: brand.cream, scrollMarginTop: 80 }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <SectionHeading
          title={t.education.eyebrow}
          action={
            <Box
              component={Link}
              href={localePath(lang, '/order')}
              sx={{
                color: brand.rosePinkDeep,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {t.education.all}
            </Box>
          }
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {t.education.items.map((item) => {
            const badge = BADGES[item.id];
            const Icon = badge.icon;
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: brand.white,
                  border: `1px solid ${brand.ink12}`,
                  borderRadius: `${radius.lg}px`,
                  overflow: 'hidden',
                  transition: 'box-shadow 240ms, border-color 240ms',
                  '&:hover': { boxShadow: shadow.soft, borderColor: brand.rosePink },
                }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    gap: 1,
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      backgroundColor: badge.bg,
                      color: badge.fg,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="h5">{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.line}
                  </Typography>

                  <Box
                    sx={{
                      mt: 'auto',
                      pt: 1.5,
                      borderTop: `1px solid ${brand.ink06}`,
                    }}
                  >
                    <AllergenChips t={t} allergens={DRINK_ALLERGENS[item.id]} />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 3, maxWidth: '80ch', color: brand.ink70 }}
        >
          {t.allergens.note}
        </Typography>
      </Container>
    </Box>
  );
}
