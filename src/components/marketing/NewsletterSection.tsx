'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand, radius, shadow } from '@/theme/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One icon per event kind, in the order the tags are listed. */
const TAG_ICONS = [CelebrationOutlinedIcon, ChatBubbleOutlineIcon, LocalCafeOutlinedIcon];

/**
 * Inline email capture for café events. Shares the signup endpoint with
 * FirstVisitPopup but is tagged with its own source so the two can be told
 * apart in the email_signups table.
 */
export function NewsletterSection() {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'invalid' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setState('invalid');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang, source: 'newsletter_section' }),
      });
      if (!res.ok) throw new Error(`signup failed: ${res.status}`);
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            backgroundColor: brand.white,
            borderRadius: `${radius.xl}px`,
            boxShadow: shadow.soft,
            p: { xs: 3, md: 6 },
          }}
        >
          <Grid container spacing={{ xs: 4, md: 8 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
                {t.newsletter.eyebrow}
              </Typography>
              <Typography variant="h2" sx={{ maxWidth: '21ch', mb: 2.5, textWrap: 'balance' }}>
                {t.newsletter.headline}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: '48ch', mb: 3 }}>
                {t.newsletter.body}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {t.newsletter.tags.map((tag, i) => {
                  const Icon = TAG_ICONS[i % TAG_ICONS.length];
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      icon={<Icon sx={{ fontSize: 16 }} />}
                      variant="outlined"
                      sx={{ borderColor: brand.ink12, color: brand.ink }}
                    />
                  );
                })}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              {state === 'done' ? (
                <Typography sx={{ color: brand.matchaGreenDeep, fontWeight: 500 }} role="status">
                  {t.newsletter.done}
                </Typography>
              ) : (
                <Box component="form" onSubmit={submit} sx={{ maxWidth: 460 }}>
                  <Typography variant="h6" component="label" htmlFor="newsletter-email">
                    {t.newsletter.emailLabel}
                  </Typography>
                  <TextField
                    id="newsletter-email"
                    type="email"
                    placeholder={t.newsletter.placeholder}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === 'invalid') setState('idle');
                    }}
                    error={state === 'invalid'}
                    helperText={
                      state === 'invalid'
                        ? t.popup.invalidEmail
                        : state === 'error'
                          ? t.errors.generic
                          : ' '
                    }
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={state === 'sending'}
                    fullWidth
                    sx={{ mt: 0.5 }}
                  >
                    {t.newsletter.cta}
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: brand.ink45 }}>
                    {t.newsletter.note}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
