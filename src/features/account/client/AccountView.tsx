'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CoffeeRoundedIcon from '@mui/icons-material/CoffeeRounded';
import GoogleIcon from '@mui/icons-material/Google';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getSupabaseAuth } from '@/shared/lib/supabaseAuthClient';
import { brand, radius, shadow } from '@/theme/brand';
import { AllergiesCard } from './AllergiesCard';
import type { AccountProfile, AccountUpdate } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * The /account page. Sign-in and sign-up are Supabase Auth's problem —
 * passwords, Google, confirmation and reset emails all happen there, nothing
 * here ever sees a credential store. Once a session cookie exists, the page
 * shows the customer's rewards and their Square-held profile (plus the
 * directory's Interests custom field) — readable, editable, deletable.
 *
 *   loading → signIn ⇄ signUp → checkEmail        (confirmation link sent)
 *                    ↘ forgot                      (reset link sent)
 *           → reset                                (arrived via reset link)
 *           → signedIn
 *           → unavailable                          (Supabase not configured)
 */

type Phase =
  | 'loading'
  | 'unavailable'
  | 'signIn'
  | 'signUp'
  | 'forgot'
  | 'checkEmail'
  | 'reset'
  | 'signedIn';

interface AccountPayload {
  profile: AccountProfile;
}

/** The one form the profile edits, all strings, empty meaning "not set". */
interface Draft {
  givenName: string;
  familyName: string;
  phoneNumber: string;
  birthday: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  postalCode: string;
}

function toDraft(payload: AccountPayload): Draft {
  const { profile } = payload;
  return {
    givenName: profile.givenName ?? '',
    familyName: profile.familyName ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    birthday: profile.birthday ?? '',
    addressLine1: profile.address?.addressLine1 ?? '',
    addressLine2: profile.address?.addressLine2 ?? '',
    locality: profile.address?.locality ?? '',
    postalCode: profile.address?.postalCode ?? '',
  };
}

function toUpdate(draft: Draft): AccountUpdate {
  const line1 = draft.addressLine1.trim();
  return {
    givenName: draft.givenName.trim(),
    familyName: draft.familyName.trim(),
    phoneNumber: draft.phoneNumber.trim(),
    birthday: draft.birthday.trim(),
    address: line1
      ? {
          addressLine1: line1,
          addressLine2: draft.addressLine2.trim(),
          locality: draft.locality.trim(),
          postalCode: draft.postalCode.trim(),
        }
      : null,
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? 'request_failed';
  } catch {
    return 'request_failed';
  }
}

/** Where Supabase Auth emails and Google send the visitor back to. */
function callbackUrl(lang: string, params = ''): string {
  const next = encodeURIComponent(`/${lang}/account${params}`);
  return `${window.location.origin}/auth/callback?next=${next}`;
}

export function AccountView() {
  const { t } = useLanguage();
  const labels = t.account;

  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [payload, setPayload] = useState<AccountPayload | null>(null);
  /** One notice slot, shown under the page title — "deleted", mostly. */
  const [notice, setNotice] = useState<string | null>(null);

  const signedIn = useCallback((next: AccountPayload) => {
    setPayload(next);
    setPhase('signedIn');
  }, []);

  // Opening move: an existing session cookie signs the visitor straight in.
  // Reset links land here as ?reset=1, callback failures as ?auth_error=1;
  // both are consumed once and swept out of the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantsReset = params.has('reset');
    if (params.has('auth_error')) setNotice(labels.authFailed);
    if (wantsReset || params.has('auth_error')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account');
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as AccountPayload;
          if (wantsReset) {
            setPayload(body);
            setPhase('reset');
          } else {
            signedIn(body);
          }
        } else if (res.status === 503) {
          setPhase('unavailable');
        } else {
          setPhase(getSupabaseAuth() ? 'signIn' : 'unavailable');
        }
      } catch {
        if (!cancelled) setPhase(getSupabaseAuth() ? 'signIn' : 'unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
    // labels are stable per locale; this must run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const loadProfile = async () => {
    const res = await fetch('/api/account');
    if (!res.ok) throw new Error(`account read failed: ${res.status}`);
    signedIn((await res.json()) as AccountPayload);
  };

  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 1 }}>
          {labels.eyebrow}
        </Typography>
        <Typography variant="h1" sx={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', mb: 3 }}>
          {labels.title}
        </Typography>

        {notice && (
          <Typography role="status" sx={{ mb: 3, color: brand.matchaGreenDeep, fontWeight: 500 }}>
            {notice}
          </Typography>
        )}

        {phase === 'unavailable' && (
          <Card>
            <Typography color="text.secondary">{labels.unavailable}</Typography>
          </Card>
        )}

        {phase === 'signIn' && (
          <Stack spacing={3}>
            <SignInCard
              email={email}
              onEmail={setEmail}
              onSignedIn={loadProfile}
              onSignUp={() => {
                setNotice(null);
                setPhase('signUp');
              }}
              onForgot={() => {
                setNotice(null);
                setPhase('forgot');
              }}
            />
            {/* Device-local, so it works before any account exists. */}
            <AllergiesCard />
          </Stack>
        )}

        {phase === 'signUp' && (
          <SignUpCard
            email={email}
            onEmail={setEmail}
            onSignedIn={loadProfile}
            onConfirmSent={() => setPhase('checkEmail')}
            onSignIn={() => setPhase('signIn')}
          />
        )}

        {phase === 'checkEmail' && (
          <Card>
            <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
              {labels.checkEmailHeadline}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {labels.checkEmailBody.replace('{email}', email.trim())}
            </Typography>
            <Button variant="text" onClick={() => setPhase('signIn')}>
              {labels.backToSignIn}
            </Button>
          </Card>
        )}

        {phase === 'forgot' && (
          <ForgotCard email={email} onEmail={setEmail} onBack={() => setPhase('signIn')} />
        )}

        {phase === 'reset' && (
          <ResetCard
            onDone={() => {
              setNotice(labels.resetDone);
              if (payload) signedIn(payload);
            }}
          />
        )}

        {phase === 'signedIn' && payload && (
          <Stack spacing={3}>
            <RewardsCard />
            <AllergiesCard />
            <ProfileCard
              payload={payload}
              onSaved={setPayload}
              onSignedOut={() => {
                setPayload(null);
                setNotice(null);
                setPhase('signIn');
              }}
              onDeleted={() => {
                setPayload(null);
                setNotice(labels.deleted);
                setPhase('signIn');
              }}
            />
          </Stack>
        )}
      </Container>
    </Box>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        backgroundColor: brand.white,
        borderRadius: `${radius.xl}px`,
        boxShadow: shadow.soft,
        p: { xs: 3, md: 4 },
      }}
    >
      {children}
    </Box>
  );
}

/** "Continue with Google" — one redirect, Supabase and Google do the rest. */
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { t, lang } = useLanguage();
  const labels = t.account;

  const go = async () => {
    const supabase = getSupabaseAuth();
    if (!supabase) return onError(t.errors.generic);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(lang) },
    });
    // Success navigates away; only a refusal (provider off, bad config) lands here.
    if (error) onError(labels.authFailed);
  };

  return (
    <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} onClick={go}>
      {labels.google}
    </Button>
  );
}

// ── Sign in: email + password, or Google ────────────────────────────────────

function SignInCard({
  email,
  onEmail,
  onSignedIn,
  onSignUp,
  onForgot,
}: {
  email: string;
  onEmail: (next: string) => void;
  onSignedIn: () => Promise<void>;
  onSignUp: () => void;
  onForgot: () => void;
}) {
  const { t } = useLanguage();
  const labels = t.account;
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const fail = (message: string) => {
    setErrorText(message);
    setState('error');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return fail(labels.invalidEmail);
    const supabase = getSupabaseAuth();
    if (!supabase) return fail(t.errors.generic);

    setState('sending');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      fail(
        error.code === 'email_not_confirmed'
          ? labels.emailNotConfirmed
          : error.code === 'invalid_credentials'
            ? labels.badCredentials
            : t.errors.generic,
      );
      return;
    }
    try {
      await onSignedIn();
    } catch {
      fail(t.errors.generic);
    }
  };

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.signInHeadline}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {labels.signInBody}
      </Typography>

      <Box component="form" onSubmit={submit}>
        <TextField
          type="email"
          label={labels.emailLabel}
          autoComplete="email"
          value={email}
          onChange={(e) => {
            onEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          type="password"
          label={labels.passwordLabel}
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (state === 'error') setState('idle');
          }}
          error={state === 'error'}
          helperText={state === 'error' ? errorText : ' '}
          fullWidth
        />
        <Button type="submit" variant="contained" fullWidth disabled={state === 'sending'} sx={{ mt: 0.5 }}>
          {labels.signIn}
        </Button>
      </Box>

      <Divider sx={{ my: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {labels.or}
        </Typography>
      </Divider>
      <GoogleButton onError={fail} />

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2.5 }}>
        <Button variant="text" size="small" onClick={onSignUp}>
          {labels.noAccount}
        </Button>
        <Button variant="text" size="small" onClick={onForgot}>
          {labels.forgot}
        </Button>
      </Stack>
    </Card>
  );
}

// ── Sign up: same fields, plus the confirmation email hop ───────────────────

function SignUpCard({
  email,
  onEmail,
  onSignedIn,
  onConfirmSent,
  onSignIn,
}: {
  email: string;
  onEmail: (next: string) => void;
  onSignedIn: () => Promise<void>;
  onConfirmSent: () => void;
  onSignIn: () => void;
}) {
  const { t, lang } = useLanguage();
  const labels = t.account;
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const fail = (message: string) => {
    setErrorText(message);
    setState('error');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return fail(labels.invalidEmail);
    if (password.length < MIN_PASSWORD) return fail(labels.invalidPassword);
    const supabase = getSupabaseAuth();
    if (!supabase) return fail(t.errors.generic);

    setState('sending');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callbackUrl(lang) },
    });
    if (error) return fail(t.errors.generic);

    // Supabase answers an already-registered email with a ghost user rather
    // than an error, so addresses cannot be enumerated; the giveaway is the
    // empty identities list.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return fail(labels.accountExists);
    }

    if (data.session) {
      // Confirmations switched off in the Dashboard — straight in.
      try {
        await onSignedIn();
      } catch {
        fail(t.errors.generic);
      }
      return;
    }
    onConfirmSent();
  };

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.signUpHeadline}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {labels.signUpBody}
      </Typography>

      <Box component="form" onSubmit={submit}>
        <TextField
          type="email"
          label={labels.emailLabel}
          autoComplete="email"
          value={email}
          onChange={(e) => {
            onEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          type="password"
          label={labels.passwordLabel}
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (state === 'error') setState('idle');
          }}
          error={state === 'error'}
          helperText={state === 'error' ? errorText : labels.passwordHint}
          fullWidth
        />
        <Button type="submit" variant="contained" fullWidth disabled={state === 'sending'} sx={{ mt: 0.5 }}>
          {labels.signUp}
        </Button>
      </Box>

      <Divider sx={{ my: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {labels.or}
        </Typography>
      </Divider>
      <GoogleButton onError={fail} />

      <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
        <Button variant="text" size="small" onClick={onSignIn}>
          {labels.haveAccount}
        </Button>
      </Stack>
    </Card>
  );
}

// ── Forgot password: Supabase emails the reset link ─────────────────────────

function ForgotCard({
  email,
  onEmail,
  onBack,
}: {
  email: string;
  onEmail: (next: string) => void;
  onBack: () => void;
}) {
  const { t, lang } = useLanguage();
  const labels = t.account;
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrorText(labels.invalidEmail);
      setState('error');
      return;
    }
    const supabase = getSupabaseAuth();
    if (!supabase) {
      setErrorText(t.errors.generic);
      setState('error');
      return;
    }
    setState('sending');
    // The response is deliberately the same whether or not the address has an
    // account — nothing to enumerate — so "sent" is shown unconditionally.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl(lang, '?reset=1'),
    });
    setState('sent');
  };

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.forgotHeadline}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {labels.forgotBody}
      </Typography>

      {state === 'sent' ? (
        <Typography role="status" sx={{ color: brand.matchaGreenDeep, fontWeight: 500, mb: 2 }}>
          {labels.resetSent}
        </Typography>
      ) : (
        <Box component="form" onSubmit={submit}>
          <TextField
            type="email"
            label={labels.emailLabel}
            autoComplete="email"
            value={email}
            onChange={(e) => {
              onEmail(e.target.value);
              if (state === 'error') setState('idle');
            }}
            error={state === 'error'}
            helperText={state === 'error' ? errorText : ' '}
            fullWidth
          />
          <Button type="submit" variant="contained" fullWidth disabled={state === 'sending'} sx={{ mt: 0.5 }}>
            {labels.sendReset}
          </Button>
        </Box>
      )}

      <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
        <Button variant="text" size="small" onClick={onBack}>
          {labels.backToSignIn}
        </Button>
      </Stack>
    </Card>
  );
}

// ── Reset: the visitor arrived from the emailed link, already signed in ─────

function ResetCard({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const labels = t.account;
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setErrorText(labels.invalidPassword);
      setState('error');
      return;
    }
    const supabase = getSupabaseAuth();
    if (!supabase) {
      setErrorText(t.errors.generic);
      setState('error');
      return;
    }
    setState('sending');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorText(t.errors.generic);
      setState('error');
      return;
    }
    onDone();
  };

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.resetHeadline}
      </Typography>
      <Box component="form" onSubmit={submit}>
        <TextField
          type="password"
          label={labels.newPasswordLabel}
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (state === 'error') setState('idle');
          }}
          error={state === 'error'}
          helperText={state === 'error' ? errorText : labels.passwordHint}
          fullWidth
          sx={{ mt: 1 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={state === 'sending'} sx={{ mt: 0.5 }}>
          {labels.resetSave}
        </Button>
      </Box>
    </Card>
  );
}

// ── Rewards: the beans, straight from Square Loyalty ────────────────────────

interface AccountRewards {
  program: { one: string; other: string; tiers: Array<{ id: string; name: string; points: number }> } | null;
  balance: number | null;
  lifetimePoints: number | null;
}

function RewardsCard() {
  const { t } = useLanguage();
  const labels = t.account;
  const [rewards, setRewards] = useState<AccountRewards | null | 'error'>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/rewards');
        if (!res.ok) throw new Error(`rewards read failed: ${res.status}`);
        const body = (await res.json()) as AccountRewards;
        if (!cancelled) setRewards(body);
      } catch {
        if (!cancelled) setRewards('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // No programme in the Square Dashboard means no section — not an apology.
  if (rewards !== 'error' && rewards?.program === null) return null;

  const program = rewards !== null && rewards !== 'error' ? rewards.program : null;
  const balance = rewards !== null && rewards !== 'error' ? rewards.balance : null;
  const unit = (count: number) => (count === 1 ? program?.one : program?.other) ?? '';

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.rewardsHeadline}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {labels.rewardsBody}
      </Typography>

      {rewards === 'error' && <Typography color="text.secondary">{labels.rewardsFailed}</Typography>}
      {rewards === null && <Typography color="text.secondary">…</Typography>}

      {rewards !== null && rewards !== 'error' && program && (
        <>
          {/* The balance, as the headline fact. */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Box
              aria-hidden
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: brand.cream,
                color: brand.rosePinkDeep,
              }}
            >
              <CoffeeRoundedIcon />
            </Box>
            <Typography sx={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1 }}>
              {balance ?? 0}{' '}
              <Typography component="span" sx={{ fontSize: '1.125rem', color: brand.ink70 }}>
                {unit(balance ?? 0)}
              </Typography>
            </Typography>
          </Stack>

          {balance === null ? (
            <Typography sx={{ color: brand.ink70, mb: 2.5 }}>{labels.rewardsNone}</Typography>
          ) : (
            rewards.lifetimePoints !== null && (
              <Typography sx={{ fontSize: '0.8125rem', color: brand.ink45, mb: 2.5 }}>
                {labels.rewardsLifetime.replace('{points}', String(rewards.lifetimePoints))}
              </Typography>
            )
          )}

          {/* The rewards on offer, cheapest first, as Square lists them. */}
          {program.tiers.map((tier) => {
            const affordable = balance !== null && balance >= tier.points;
            return (
              <Box
                key={tier.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.4,
                  borderTop: `1px solid ${brand.ink06}`,
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 500 }}>{tier.name}</Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: brand.ink45 }}>
                    {tier.points} {unit(tier.points)}
                  </Typography>
                </Box>
                {affordable ? (
                  <Typography
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: brand.matchaGreenDeep,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <CheckCircleOutlineRoundedIcon sx={{ fontSize: '1.1rem' }} aria-hidden />
                    {labels.rewardsReady}
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: '0.8125rem', color: brand.ink45, whiteSpace: 'nowrap' }}>
                    {labels.rewardsToGo.replace('{points}', String(tier.points - (balance ?? 0)))}
                  </Typography>
                )}
              </Box>
            );
          })}

          <Typography sx={{ fontSize: '0.75rem', color: brand.ink45, mt: 2 }}>
            {labels.rewardsRedeemNote}
          </Typography>
        </>
      )}
    </Card>
  );
}

// ── The profile: read, rectify, erase ───────────────────────────────────────

function ProfileCard({
  payload,
  onSaved,
  onSignedOut,
  onDeleted,
}: {
  payload: AccountPayload;
  onSaved: (next: AccountPayload) => void;
  onSignedOut: () => void;
  onDeleted: () => void;
}) {
  const { t } = useLanguage();
  const labels = t.account;
  const [draft, setDraft] = useState<Draft>(() => toDraft(payload));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (field: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((previous) => ({ ...previous, [field]: event.target.value }));
    if (state === 'saved' || state === 'error') setState('idle');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('saving');
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toUpdate(draft)),
      });
      if (!res.ok) {
        const error = await readError(res);
        setErrorText(error === 'invalid_request' ? labels.invalidPhone : t.errors.generic);
        setState('error');
        return;
      }
      const body = (await res.json()) as AccountPayload;
      setDraft(toDraft(body));
      onSaved(body);
      setState('saved');
    } catch {
      setErrorText(t.errors.generic);
      setState('error');
    }
  };

  const signOut = async () => {
    try {
      await getSupabaseAuth()?.auth.signOut();
    } finally {
      onSignedOut();
    }
  };

  const erase = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) throw new Error(`deletion failed: ${res.status}`);
      // The server already revoked the session; this clears the local copy.
      await getSupabaseAuth()
        ?.auth.signOut()
        .catch(() => undefined);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setErrorText(t.errors.generic);
      setState('error');
    }
  };

  return (
    <Card>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {labels.profileHeadline}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {labels.profileBody}
      </Typography>

      <Box component="form" onSubmit={save}>
        <Grid container columnSpacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.givenName} value={draft.givenName} onChange={set('givenName')} autoComplete="given-name" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.familyName} value={draft.familyName} onChange={set('familyName')} autoComplete="family-name" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            {/* The sign-in email — owned by the login, not the profile. */}
            <TextField
              label={labels.emailField}
              value={payload.profile.emailAddress ?? ''}
              type="email"
              fullWidth
              disabled
              helperText={labels.emailManaged}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.phone} value={draft.phoneNumber} onChange={set('phoneNumber')} type="tel" autoComplete="tel" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.birthday} value={draft.birthday} onChange={set('birthday')} type="date" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Field label={labels.addressLine1} value={draft.addressLine1} onChange={set('addressLine1')} autoComplete="address-line1" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Field label={labels.addressLine2} value={draft.addressLine2} onChange={set('addressLine2')} autoComplete="address-line2" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.locality} value={draft.locality} onChange={set('locality')} autoComplete="address-level2" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label={labels.postalCode} value={draft.postalCode} onChange={set('postalCode')} autoComplete="postal-code" />
          </Grid>
        </Grid>

        {state === 'error' && (
          <Typography role="alert" sx={{ color: brand.rosePinkDeep, fontSize: '0.875rem', mb: 1.5 }}>
            {errorText}
          </Typography>
        )}
        {state === 'saved' && (
          <Typography role="status" sx={{ color: brand.matchaGreenDeep, fontWeight: 500, mb: 1.5 }}>
            {labels.saved}
          </Typography>
        )}

        <Button type="submit" variant="contained" fullWidth disabled={state === 'saving'}>
          {labels.save}
        </Button>
      </Box>

      {/* Leaving: sign out first, erasure below it. */}
      <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${brand.ink06}` }}>
        <Button variant="outlined" fullWidth onClick={signOut}>
          {labels.signOut}
        </Button>
      </Box>

      <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${brand.ink06}` }}>
        <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
          {labels.deleteHeadline}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: brand.ink70, mb: 2 }}>
          {labels.deleteBody}
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setConfirmingDelete(true)}>
          {labels.delete}
        </Button>
      </Box>

      {/* Erasure asks twice: the button above, then this popup to mean it. */}
      <Dialog
        open={confirmingDelete}
        onClose={() => {
          if (!deleting) setConfirmingDelete(false);
        }}
        aria-labelledby="delete-account-title"
      >
        <DialogTitle id="delete-account-title">{labels.deleteHeadline}</DialogTitle>
        <DialogContent>
          <DialogContentText>{labels.deleteAsk}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
            {labels.deleteKeep}
          </Button>
          <Button variant="contained" color="error" onClick={erase} disabled={deleting}>
            {labels.deleteConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      autoComplete={autoComplete}
      fullWidth
      sx={{ mb: 2 }}
      slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}
