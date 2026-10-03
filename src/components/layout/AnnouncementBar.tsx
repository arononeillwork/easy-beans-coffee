'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { FirstVisitDialog } from '@/components/marketing/FirstVisitDialog';
import { markOfferSeen } from '@/components/marketing/offerSeen';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';

/**
 * Slim launch bar above the header, on every page: subscribe to the newsletter
 * and get 10% off the online shop for 6 months.
 *
 * It opens the same dialog as the first-visit popup rather than carrying its
 * own field, so there is one signup flow, one consent decision and one place
 * the offer code is issued. Signing up here also marks the offer seen, which
 * stops the popup interrupting the same visitor a moment later.
 *
 * Sits in normal flow, not fixed: it scrolls away and leaves the sticky header
 * at the top of the viewport, which is where a nav belongs.
 */
export function AnnouncementBar() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          backgroundColor: brand.rosePink,
          color: brand.ink,
          // Above the sticky header's own stacking context so the shadow of a
          // scrolled header never rides over it on the way past.
          position: 'relative',
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      >
        <Container maxWidth="lg">
          <Box
            component="button"
            type="button"
            onClick={() => setDialogOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 1, sm: 1.5 },
              width: '100%',
              py: 1.25,
              px: 0,
              border: 0,
              background: 'none',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
              textAlign: 'center',
              '&:hover .ebc-banner-cta': { borderBottomColor: brand.ink },
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              {t.banner.text}
            </Box>
            <Box
              component="span"
              className="ebc-banner-cta"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0,
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                fontWeight: 600,
                borderBottom: '1px solid transparent',
                transition: 'border-color 150ms',
              }}
            >
              {t.banner.cta}
              <ArrowForwardIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        </Container>
      </Box>

      {dialogOpen ? (
        <FirstVisitDialog
          source="announcement_bar"
          onSeen={markOfferSeen}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </>
  );
}
