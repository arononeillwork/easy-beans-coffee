'use client';

import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Lang } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import { INSTAGRAM_URL } from '@/shared/lib/social';
import { brand, radius } from '@/theme/brand';
import { competitionCopy } from './copy';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;
const IG_RE = /^[a-z0-9._]{1,30}$/;

type Status = 'idle' | 'sending' | 'done' | 'already' | 'error' | 'rate';
type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'instagram' | 'ticks', string>>;

const fieldSx = {
  '& .MuiOutlinedInput-root': { backgroundColor: brand.white, borderRadius: `${radius.md}px` },
};

function StepBadge({ n, colour }: { n: number; colour: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#3B2A20',
        color: brand.cream,
        fontWeight: 600,
        outline: `6px solid ${colour}`,
      }}
    >
      {n}
    </Box>
  );
}

export function CompetitionForm({ lang, src }: { lang: Lang; src?: string }) {
  const c = competitionCopy(lang);
  const [values, setValues] = useState({ name: '', email: '', phone: '', instagram: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptin, setMarketingOptin] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = (): FieldErrors => {
    const er: FieldErrors = {};
    const ig = values.instagram.trim().replace(/^@+/, '').toLowerCase();
    if (values.name.trim().length < 2) er.name = c.errName;
    if (!EMAIL_RE.test(values.email.trim())) er.email = c.errEmail;
    if (values.phone.trim() && !PHONE_RE.test(values.phone.trim())) er.phone = c.errPhone;
    if (!IG_RE.test(ig)) er.instagram = c.errInstagram;
    if (!acceptTerms || !marketingOptin) er.ticks = c.errTicks;
    return er;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          instagram: values.instagram.trim(),
          acceptTerms,
          marketingOptin,
          lang,
          src,
        }),
      });
      if (res.status === 429) return setStatus('rate');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { alreadyEntered?: boolean };
      setStatus(data.alreadyEntered ? 'already' : 'done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done' || status === 'already') {
    return (
      <Box role="status" sx={{ textAlign: 'center', py: { xs: 4, md: 6 } }}>
        <Typography variant="h3" component="h2" sx={{ color: '#3B2A20' }}>
          {status === 'done' ? c.doneTitle : c.alreadyTitle}
        </Typography>
        <Typography sx={{ mt: 1.5, color: brand.ink70, maxWidth: '42ch', mx: 'auto' }}>
          {status === 'done' ? c.doneBody : c.alreadyBody}
        </Typography>
        <Button
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          variant="contained"
          sx={{ mt: 3, borderRadius: 999, backgroundColor: '#3B2A20', color: brand.cream, '&:hover': { backgroundColor: '#24180f' } }}
        >
          {c.followCta}
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Typography variant="h3" component="h2" sx={{ color: '#3B2A20' }}>
        {c.formTitle}
      </Typography>
      <Typography sx={{ mt: 1, color: brand.ink70 }}>{c.formIntro}</Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2, borderRadius: `${radius.lg}px`, backgroundColor: brand.rosePinkTint }}>
          <StepBadge n={1} colour={brand.rosePinkTint} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{c.stepFollow}</Typography>
          </Box>
          <Button
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            variant="outlined"
            size="small"
            sx={{ borderRadius: 999, borderColor: '#3B2A20', color: '#3B2A20', whiteSpace: 'nowrap' }}
          >
            @easy.beans.coffee
          </Button>
        </Stack>

        <Box sx={{ p: 2, borderRadius: `${radius.lg}px`, backgroundColor: brand.lilacTint }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <StepBadge n={2} colour={brand.lilacTint} />
            <Typography sx={{ fontWeight: 600 }}>{c.stepSignup}</Typography>
          </Stack>

          <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label={c.name} value={values.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} autoComplete="name" required sx={fieldSx} />
            <TextField label={c.email} type="email" value={values.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} autoComplete="email" inputMode="email" required sx={fieldSx} />
            <TextField
              label={c.instagram}
              value={values.instagram}
              onChange={set('instagram')}
              error={!!errors.instagram}
              helperText={errors.instagram ?? c.instagramHelp}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="@yourname"
              required
              sx={fieldSx}
            />
            <TextField label={c.phone} type="tel" value={values.phone} onChange={set('phone')} error={!!errors.phone} helperText={errors.phone} autoComplete="tel" inputMode="tel" sx={fieldSx} />
          </Box>

          <Stack sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={marketingOptin} onChange={(e) => { setMarketingOptin(e.target.checked); setErrors((er) => ({ ...er, ticks: undefined })); }} />}
              label={<Typography variant="body2">{c.marketing}</Typography>}
              sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
            />
            <FormControlLabel
              control={<Checkbox checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); setErrors((er) => ({ ...er, ticks: undefined })); }} />}
              label={
                <Typography variant="body2">
                  {c.termsBefore}
                  <Link href={localePath(lang, '/competition-terms')} target="_blank" style={{ color: '#3B2A20', fontWeight: 600 }}>
                    {c.termsLink}
                  </Link>
                  .
                </Typography>
              }
              sx={{ alignItems: 'flex-start', mt: 0.5, '& .MuiCheckbox-root': { pt: 0.25 } }}
            />
            {errors.ticks && (
              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                {errors.ticks}
              </Typography>
            )}
          </Stack>
        </Box>

        {(status === 'error' || status === 'rate') && (
          <Typography role="alert" color="error">
            {status === 'rate' ? c.errRate : c.errGeneric}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={status === 'sending'}
          sx={{ height: 56, borderRadius: 999, backgroundColor: '#3B2A20', color: brand.cream, fontSize: '1.05rem', '&:hover': { backgroundColor: '#24180f' } }}
        >
          {status === 'sending' ? c.sending : c.submit}
        </Button>
      </Stack>
    </Box>
  );
}
