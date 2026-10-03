'use client';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';

/** Collection-page FAQ — answers the questions the counter gets asked most. */
export function ShopFaq() {
  const { t } = useLanguage();

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>
        {t.shop.faqTitle}
      </Typography>
      {t.shop.faq.map((entry) => (
        <Accordion
          key={entry.q}
          disableGutters
          square
          sx={{
            backgroundColor: 'transparent',
            borderTop: `1px solid ${brand.ink12}`,
            '&:last-of-type': { borderBottom: `1px solid ${brand.ink12}` },
            '&::before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, py: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>{entry.q}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
            <Typography color="text.secondary" sx={{ maxWidth: '62ch' }}>
              {entry.a}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
