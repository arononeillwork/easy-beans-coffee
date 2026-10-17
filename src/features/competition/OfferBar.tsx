'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { FirstVisitDialog } from '@/components/marketing/FirstVisitDialog';
import { markOfferSeen } from '@/components/marketing/offerSeen';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';

/**
 * Slim newsletter / 10%-off bar for the top of the competition page. Opens the
 * site's existing subscribe dialog (source `announcement_bar`), which issues
 * and emails the code exactly as the first-visit popup does.
 */
export function OfferBar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <ButtonBase
        onClick={() => setOpen(true)}
        sx={{
          width: '100%',
          minHeight: 44,
          px: 2,
          py: 1,
          backgroundColor: brand.rosePink,
          color: '#3B2A20',
          fontFamily: 'inherit',
          fontSize: { xs: '0.9rem', md: '0.95rem' },
          fontWeight: 500,
          textAlign: 'center',
          gap: 1,
          '&:hover': { backgroundColor: brand.rosePinkPress },
        }}
      >
        <span>
          {t.popup.headline} · {t.popup.body}
        </span>
        <Box component="span" sx={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px', whiteSpace: 'nowrap' }}>
          {t.popup.cta} →
        </Box>
      </ButtonBase>
      {open && <FirstVisitDialog source="announcement_bar" onSeen={markOfferSeen} onClose={() => setOpen(false)} />}
    </>
  );
}
