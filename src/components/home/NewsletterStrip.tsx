'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';
import { EmailSignupForm } from './EmailSignupForm';

/**
 * Event emails. Tagged `newsletter_section` on the server, which grants
 * events consent only — never offers.
 */
export function NewsletterStrip() {
  const { t } = useLanguage();
  return (
    <Box component="section" aria-labelledby="news-title" sx={{ backgroundColor: brand.rosePink, color: brand.ink }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 3, md: 8 }, alignItems: 'center' }}>
          <Box>
            <Typography id="news-title" variant="h3" component="h2">
              {t.newsletter.headline}
            </Typography>
            <Typography sx={{ mt: 1, color: brand.ink70 }}>{t.newsletter.body}</Typography>
          </Box>
          <EmailSignupForm
            source="newsletter_section"
            cta={t.newsletter.cta}
            done={t.newsletter.done}
            buttonSx={{ backgroundColor: brand.cream, color: brand.ink, '&:hover': { backgroundColor: brand.white } }}
          />
        </Box>
      </Container>
    </Box>
  );
}
