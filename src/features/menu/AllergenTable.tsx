import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { AllergenChips } from '@/components/marketing/AllergenChips';
import { DRINK_ALLERGENS } from '@/i18n/allergens';
import type { SiteContent } from '@/i18n/content/en';
import { brand } from '@/theme/brand';

/**
 * Allergens for the standard serve of each drink family, from the one shared
 * table in i18n/allergens.ts. Icon and word on every entry.
 */
export function AllergenTable({ t }: { t: SiteContent }) {
  return (
    <Box component="section" aria-labelledby="allergens-title" sx={{ borderTop: `1px solid ${brand.ink12}` }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Typography id="allergens-title" variant="h4" component="h2" sx={{ mb: 3 }}>
          {t.allergens.title}
        </Typography>
        <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 3 }}>
          {t.education.items.map((item) => (
            <Box key={item.id}>
              <Typography component="dt" sx={{ fontWeight: 500, mb: 1 }}>
                {item.name}
              </Typography>
              <Box component="dd" sx={{ m: 0 }}>
                <AllergenChips t={t} allergens={DRINK_ALLERGENS[item.id]} />
              </Box>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mt: 3, color: brand.ink70, maxWidth: '60ch' }}>
          {t.allergens.note}
        </Typography>
      </Container>
    </Box>
  );
}
