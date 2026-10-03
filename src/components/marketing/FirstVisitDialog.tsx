'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '@/i18n/LanguageProvider';
import { INTEREST_KEYS, type InterestKey } from '@/shared/lib/interests';
import { brand } from '@/theme/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Deliberately loose: digits with the usual separators, international prefix
// allowed. The phone is a nice-to-have and must never block a signup.
const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;

/**
 * The subscribe dialog itself, split from FirstVisitPopup so MUI's Dialog and
 * TextField are fetched only for the visit that actually sees it. Newsletter
 * signup with interest topics, sweetened with a 10% code for the online shop.
 *
 * `onSeen` and `onClose` are deliberately separate. A successful signup counts
 * as seen but must leave the dialog standing — the offer code is on screen and
 * closing it out from under the visitor would take the code with it.
 */
export function FirstVisitDialog({
  onSeen,
  onClose,
  source = 'first_visit_popup',
}: {
  onSeen: () => void;
  /** Called once the dialog has actually closed, for owners that unmount it. */
  onClose?: () => void;
  /** Which capture point this instance reports to `/api/signup`. */
  source?: 'first_visit_popup' | 'announcement_bar';
}) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interests, setInterests] = useState<InterestKey[]>([]);
  const [state, setState] = useState<
    'idle' | 'invalid' | 'invalidPhone' | 'sending' | 'done' | 'error'
  >('idle');
  const [offerCode, setOfferCode] = useState<string | null>(null);

  const dismiss = () => {
    onSeen();
    setOpen(false);
    onClose?.();
  };

  const toggleInterest = (key: InterestKey) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const submit = async () => {
    if (!EMAIL_RE.test(email)) {
      setState('invalid');
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      setState('invalidPhone');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang, source, interests, phone: trimmedPhone || undefined }),
      });
      if (!res.ok) throw new Error(`signup failed: ${res.status}`);
      // The lead is stored by the time we get a 2xx, so a body we cannot read
      // must not be reported to the visitor as a failed signup.
      const body = await res.json().catch(() => ({}) as { offerCode?: string | null });
      setOfferCode(body.offerCode ?? null);
      setState('done');
      onSeen();
    } catch {
      setState('error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="xs"
      fullWidth
      aria-labelledby="first-visit-offer"
      slotProps={{ paper: { sx: { backgroundColor: brand.cream, p: 1 } } }}
    >
      <Box sx={{ position: 'relative', p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <IconButton
          aria-label={t.popup.close}
          onClick={dismiss}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Typography id="first-visit-offer" variant="h4" sx={{ mb: 1, textWrap: 'balance' }}>
          {t.popup.headline}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.popup.body}
        </Typography>

        {state === 'done' ? (
          <Stack spacing={1} sx={{ py: 1 }}>
            <Typography sx={{ color: brand.matchaGreenDeep }}>{t.popup.done}</Typography>
            {/* Shown straight away because the email may take a minute, or land
                in spam — the code should never depend on delivery alone. */}
            {offerCode && (
              <>
                <Typography
                  variant="caption"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: brand.ink45 }}
                >
                  {t.popup.codeLabel}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: brand.rosePinkDeep,
                  }}
                >
                  {offerCode}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.popup.codeNote}
                </Typography>
              </>
            )}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Box sx={{ mb: 0.5 }}>
              <Typography variant="h6" component="p" sx={{ color: brand.ink45, mb: 1.25 }}>
                {t.popup.interestsLabel}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
                {INTEREST_KEYS.map((key) => {
                  const selected = interests.includes(key);
                  return (
                    <Chip
                      key={key}
                      label={t.popup.interests[key]}
                      onClick={() => toggleInterest(key)}
                      aria-pressed={selected}
                      icon={selected ? <CheckIcon sx={{ fontSize: 15 }} /> : undefined}
                      sx={{
                        backgroundColor: selected ? brand.rosePink : 'transparent',
                        border: `1px solid ${selected ? brand.rosePink : brand.ink12}`,
                        color: brand.ink,
                        '& .MuiChip-icon': { color: brand.ink },
                        '&:hover': {
                          backgroundColor: selected ? brand.rosePinkPress : brand.white,
                        },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
            <TextField
              type="email"
              size="small"
              label={t.popup.emailLabel}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === 'invalid') setState('idle');
              }}
              error={state === 'invalid'}
              // No reserved helper line: it opened an uneven gap under the
              // field. The dialog can grow the moment there is a message.
              helperText={
                state === 'invalid' ? t.popup.invalidEmail : state === 'error' ? t.errors.generic : undefined
              }
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': t.popup.emailLabel } }}
            />
            <TextField
              type="tel"
              size="small"
              label={t.popup.phoneLabel}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (state === 'invalidPhone') setState('idle');
              }}
              error={state === 'invalidPhone'}
              helperText={state === 'invalidPhone' ? t.popup.invalidPhone : undefined}
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': t.popup.phoneLabel } }}
            />
            <Button variant="contained" onClick={submit} disabled={state === 'sending'}>
              {t.popup.cta}
            </Button>
            <Button variant="text" size="small" onClick={dismiss} sx={{ color: 'text.secondary' }}>
              {t.popup.dismiss}
            </Button>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}
