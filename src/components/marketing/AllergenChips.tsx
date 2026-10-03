import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ALLERGEN_GLYPHS } from '@/components/icons/AllergenIcons';
import type { AllergenId } from '@/i18n/allergens';
import type { SiteContent } from '@/i18n/content/en';
import { brand, radius } from '@/theme/brand';

/**
 * Allergen row for a drink. Icon *and* word on every chip: an icon alone is a
 * guess, and this is the one place on the site where a guess is not acceptable.
 *
 * The glyphs mirror the counter sign, so someone who has read the sign
 * recognises them here without translating anything.
 */
export function AllergenChips({
  t,
  allergens,
}: {
  t: SiteContent;
  allergens: readonly AllergenId[];
}) {
  if (allergens.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: brand.ink45 }}>
        {t.allergens.none}
      </Typography>
    );
  }

  const spoken = allergens.map((id) => t.allergens.labels[id]).join(', ');

  return (
    <Stack
      direction="row"
      spacing={0.75}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      role="group"
      aria-label={`${t.allergens.contains}: ${spoken}`}
    >
      <Typography
        variant="caption"
        aria-hidden
        sx={{ color: brand.ink45, mr: 0.25, whiteSpace: 'nowrap' }}
      >
        {t.allergens.contains}
      </Typography>
      {allergens.map((id) => {
        const Glyph = ALLERGEN_GLYPHS[id];
        return (
          <Box
            key={id}
            aria-hidden
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              pl: 0.5,
              pr: 1,
              py: 0.25,
              borderRadius: `${radius.pill}px`,
              backgroundColor: brand.limewashTint,
              color: brand.ink,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: brand.white,
                color: brand.rosePinkDeep,
              }}
            >
              <Glyph size={16} />
            </Box>
            <Typography
              component="span"
              sx={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 }}
            >
              {t.allergens.labels[id]}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
