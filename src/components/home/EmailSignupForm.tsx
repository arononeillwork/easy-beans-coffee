'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupSource = 'newsletter_section' | 'shop_page';

/**
 * One email field and a button, posting to /api/signup. What the address is
 * consented to is decided on the server from `source`, never here. When the
 * source carries the 10% offer, the code comes back and is shown at once.
 */
export function EmailSignupForm({
  source,
  cta,
  done,
  buttonSx,
  helperColor = brand.ink,
}: {
  source: SignupSource;
  cta: string;
  done: string;
  buttonSx?: object;
  helperColor?: string;
}) {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string | null>(null);
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
        body: JSON.stringify({ email, lang, source }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json().catch(() => ({}))) as { offerCode?: string | null };
      setCode(body.offerCode ?? null);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <Box role="status" data-testid="signup-done">
        <Typography sx={{ fontWeight: 500 }}>{done}</Typography>
        {code && (
          <Typography sx={{ mt: 1 }}>
            {t.popup.codeLabel}:{' '}
            <Box component="span" sx={{ fontFamily: 'var(--font-poppins)', fontWeight: 600, letterSpacing: '0.04em' }}>
              {code}
            </Box>
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="form"
      noValidate
      onSubmit={submit}
      sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' } }}
    >
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
        sx={{
          '& .MuiOutlinedInput-root': { backgroundColor: brand.white, borderRadius: 999 },
          '& fieldset': { borderColor: 'transparent' },
          '& .MuiFormHelperText-root.Mui-error': { color: helperColor },
        }}
      />
      <Button type="submit" variant="contained" disabled={state === 'sending'} sx={{ flexShrink: 0, height: 56, ...buttonSx }}>
        {cta}
      </Button>
    </Box>
  );
}
