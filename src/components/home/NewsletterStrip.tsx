'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Event emails. Shares /api/signup with the first-visit popup but is tagged
 * `newsletter_section`, which grants events consent only — never offers.
 */
export function NewsletterStrip() {
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
      if (!res.ok) throw new Error(String(res.status));
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <Box component="section" aria-labelledby="news-title" sx={{ backgroundColor: brand.roseWash }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 3, md: 8 }, alignItems: 'center' }}>
          <Box>
            <Typography id="news-title" variant="h3" component="h2">
              {t.newsletter.headline}
            </Typography>
            <Typography sx={{ mt: 1, color: brand.ink70 }}>{t.newsletter.body}</Typography>
          </Box>
          {state === 'done' ? (
            <Typography role="status" sx={{ fontWeight: 500 }}>
              {t.newsletter.done}
            </Typography>
          ) : (
            <Box component="form" noValidate onSubmit={submit} sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' } }}>
              <TextField
                type="email"
                label={t.newsletter.emailLabel}
                placeholder={t.newsletter.placeholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== 'sending') setState('idle');
                }}
                error={state === 'invalid' || state === 'error'}
                helperText={state === 'invalid' ? t.popup.invalidEmail : state === 'error' ? t.errors.generic : ' '}
                autoComplete="email"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: brand.white, borderRadius: 999 }, '& fieldset': { borderColor: 'transparent' } }}
              />
              <Button type="submit" variant="contained" disabled={state === 'sending'} sx={{ flexShrink: 0, height: 56, backgroundColor: brand.ink, color: brand.cream, '&:hover': { backgroundColor: '#000' } }}>
                {t.newsletter.cta}
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}
