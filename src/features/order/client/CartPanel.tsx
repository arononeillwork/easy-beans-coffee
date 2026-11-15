'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { accountApi } from '@/features/account/client/accountApi';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { brand, radius, shadow } from '@/theme/brand';
import type { CartApi } from '../hooks/useCart';
import type { CartLine, CheckoutRequestBody } from '../types';
import { formatEuros } from '../lib/price';
import {
  FALLBACK_HOURS,
  isOpenForAsap,
  nextOrderingOpen,
  ORDER_CUTOFF_MIN,
  PREP_TIME_MIN,
  RETAIL_PREP_TIME_MIN,
} from '../lib/pickupTimes';
import type { DayHours } from '@/shared/lib/openingHours';
import { describeWhen } from '@/shared/lib/openNow';

const CAFE_TZ = 'Europe/Madrid';
const THUMB = 60;

interface Props {
  cart: CartApi;
}

/** Whether the visitor can order: collection orders need an account. */
type AccountState =
  | { kind: 'loading' }
  | { kind: 'signedIn'; email: string }
  | { kind: 'signedOut' }
  /** Accounts not set up on this deployment, or unreachable: no online orders. */
  | { kind: 'unavailable' };

/**
 * Cart lines + who the order is for + hand-off to Square checkout.
 *
 * Collection is always "now": every order goes in as ASAP and the café has to
 * be open to take it, so there is no time picker and no day picker — when we
 * are shut the panel says so and checkout is off.
 *
 * Ordering needs an account: the order is recorded on it (the account page
 * lists it) and the receipt goes to its sign-in email. A signed-out visitor
 * gets a sign-in button that brings them back here with the cart open — the
 * cart itself is kept in the browser, so nothing is lost on the way.
 */
export function CartPanel({ cart }: Props) {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [account, setAccount] = useState<AccountState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Who is signed in decides whether the order can go through; their Square
  // profile also fills the name once, leaving anything already typed alone.
  useEffect(() => {
    let cancelled = false;
    accountApi.fetchProfile().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setAccount({ kind: result.error === 'not_signed_in' ? 'signedOut' : 'unavailable' });
        return;
      }
      const { givenName, familyName, emailAddress } = result.profile;
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      if (fullName) setName((current) => current || fullName);
      setAccount({ kind: 'signedIn', email: emailAddress ?? '' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Back here, cart open, once signed in (CartProvider reads ?cart=open).
  const signInHref = `${localePath(lang, '/account')}?next=${encodeURIComponent(`${pathname}?cart=open`)}`;

  // Mirrors prepMinutesFor on the server; the server call stays authoritative.
  const retailOnly = cart.lines.length > 0 && cart.lines.every((l) => l.kind === 'retail');
  const prepMinutes = retailOnly ? RETAIL_PREP_TIME_MIN : PREP_TIME_MIN;
  // Live hours (Google Maps, via the server) drive the open/closed state; the
  // known-good week stands in until they load. Checkout re-checks server-side.
  const [hours, setHours] = useState<DayHours[]>(FALLBACK_HOURS);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ordering-hours')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { hours?: DayHours[] } | null) => {
        if (!cancelled && body?.hours?.length) setHours(body.hours);
      })
      .catch(() => {});
    // Re-evaluate every minute so the cart closes itself at the cutoff even if
    // it was opened just before.
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, []);
  const open = isOpenForAsap(now, CAFE_TZ, prepMinutes, hours);
  const reopensAt = open ? null : nextOrderingOpen(now, CAFE_TZ, prepMinutes, hours);

  const canSubmit =
    cart.lines.length > 0 && open && account.kind === 'signedIn' && name.trim().length >= 2 && !submitting;

  const checkout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const body: CheckoutRequestBody = {
        lines: cart.lines.map((l) => ({
          variationId: l.variationId,
          quantity: l.quantity,
          modifierIds: l.modifierIds,
          note: l.note,
        })),
        pickup: { type: 'ASAP' },
        customer: {
          name: name.trim(),
          note: note.trim() || undefined,
        },
        lang,
      };
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string; reason?: string } | null;
        // Signed out in another tab, or the session expired: back to the sign-in prompt.
        if (payload?.error === 'sign_in_required') {
          setAccount({ kind: 'signedOut' });
          return;
        }
        setError(
          payload?.error === 'catalog_mismatch'
            ? t.errors.cartChanged
            : payload?.error === 'pickup_invalid'
              ? t.errors.closed
              : payload?.reason
                ? `${t.errors.generic} (${payload.reason})`
                : t.errors.generic,
        );
        return;
      }
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };
      window.location.assign(checkoutUrl);
    } catch {
      setError(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.lines.length === 0) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ flexGrow: 1, px: 4, textAlign: 'center' }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: brand.roseWash,
          }}
        >
          <StorefrontOutlinedIcon sx={{ color: brand.rosePinkDeep }} />
        </Box>
        <Typography color="text.secondary">{t.order.emptyCart}</Typography>
      </Stack>
    );
  }

  return (
    <>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, pb: 3 }}>
        <Stack spacing={1}>
          {cart.lines.map((line) => (
            <CartRow key={line.lineId} line={line} cart={cart} />
          ))}
        </Stack>

        <PickupNote open={open} prepMinutes={prepMinutes} reopensAt={reopensAt} now={now} />

        {account.kind === 'signedIn' && (
          <Stack spacing={1.25} sx={{ mt: 2.5 }}>
            <Field required label={t.order.nameLabel} value={name} onChange={setName} />
            <Field label={t.order.noteLabel} value={note} onChange={setNote} />
            {account.email && (
              <Typography variant="caption" data-testid="receipt-email" sx={{ color: brand.ink70, px: 0.5 }}>
                {t.order.receiptTo.replace('{email}', account.email)}
              </Typography>
            )}
          </Stack>
        )}

        {account.kind === 'signedOut' && <SignInNote />}

        {account.kind === 'unavailable' && (
          <Typography variant="body2" sx={{ mt: 2.5, color: brand.ink70 }}>
            {t.order.accountsDown}
          </Typography>
        )}

        {error && (
          <Typography
            role="alert"
            variant="body2"
            sx={{ mt: 2, color: brand.rosePinkDeep, fontWeight: 500 }}
          >
            {error}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 3 },
          pt: 2,
          pb: { xs: 2, sm: 2.5 },
          backgroundColor: brand.white,
          borderTop: `1px solid ${brand.ink12}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
          <Typography sx={{ color: brand.ink70 }}>{t.order.total}</Typography>
          <Typography variant="h4">{formatEuros(cart.subtotalCents, lang)}</Typography>
        </Stack>
        {account.kind === 'signedOut' ? (
          <Button
            component={Link}
            href={signInHref}
            variant="contained"
            fullWidth
            size="large"
            startIcon={<PersonOutlineRoundedIcon />}
            data-testid="cart-sign-in"
          >
            {t.order.signInCta}
          </Button>
        ) : (
          <Button variant="contained" fullWidth size="large" disabled={!canSubmit} onClick={checkout}>
            {t.order.checkout}
          </Button>
        )}
      </Box>
    </>
  );
}

/**
 * One line: photo, what it is, what it costs. The stepper turns its minus into
 * a bin at quantity one, so removing something is the same control the customer
 * is already pressing rather than a third icon on every row.
 */
function CartRow({ line, cart }: { line: CartLine; cart: CartApi }) {
  const { t, lang } = useLanguage();
  const last = line.quantity <= 1;
  const detail = [
    line.variationName && line.variationName !== 'Regular' ? line.variationName : null,
    ...line.modifierNames,
  ].filter(Boolean);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        p: 1,
        borderRadius: `${radius.lg}px`,
        transition: 'background-color 150ms',
        '@media (hover: hover)': { '&:hover': { backgroundColor: brand.ink06 } },
      }}
    >
      <LineThumb line={line} />

      <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box>
          <Typography sx={{ fontWeight: 500, lineHeight: 1.3 }}>{line.itemName}</Typography>
          {detail.length > 0 && (
            <Typography variant="caption" sx={{ color: brand.ink45 }}>
              {detail.join(' · ')}
            </Typography>
          )}
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          alignSelf="flex-start"
          sx={{ borderRadius: `${radius.pill}px`, backgroundColor: brand.ink06, px: 0.25 }}
        >
          <IconButton
            size="small"
            aria-label={last ? t.order.remove : '-'}
            onClick={() =>
              last ? cart.removeLine(line.lineId) : cart.updateQuantity(line.lineId, line.quantity - 1)
            }
            sx={{ color: brand.ink70 }}
          >
            {last ? <DeleteOutlineIcon sx={{ fontSize: 17 }} /> : <RemoveIcon sx={{ fontSize: 17 }} />}
          </IconButton>
          <Typography
            aria-label={t.order.quantity}
            sx={{ minWidth: 18, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}
          >
            {line.quantity}
          </Typography>
          <IconButton
            size="small"
            aria-label="+"
            onClick={() => cart.updateQuantity(line.lineId, line.quantity + 1)}
            sx={{ color: brand.ink70 }}
          >
            <AddIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Stack>
      </Stack>

      <Typography sx={{ fontWeight: 500, flexShrink: 0, alignSelf: 'flex-start', pt: 0.25 }}>
        {formatEuros(line.unitPriceCents * line.quantity, lang)}
      </Typography>
    </Stack>
  );
}

/**
 * Square is the only source of product photography and roughly half the catalog
 * has none, so the stand-in is the common case rather than an edge case — as is
 * a shot that exists but never arrives.
 */
function LineThumb({ line }: { line: CartLine }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(line.imageUrl) && !failed;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        flexShrink: 0,
        width: THUMB,
        height: THUMB,
        borderRadius: `${radius.md}px`,
        overflow: 'hidden',
        backgroundColor: brand.roseWash,
        boxShadow: shadow.insetHairline,
      }}
    >
      {showPhoto ? (
        <Image
          src={line.imageUrl!}
          alt=""
          fill
          sizes={`${THUMB}px`}
          style={{ objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: brand.rosePinkDeep,
            }}
          >
            {line.itemName.trim().charAt(0).toUpperCase()}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/** Collection is the only fulfilment, so this states it rather than asking. */
function PickupNote({
  open,
  prepMinutes,
  reopensAt,
  now,
}: {
  open: boolean;
  prepMinutes: number;
  reopensAt: string | null;
  now: number;
}) {
  const { t, lang } = useLanguage();
  const reopenLabel = reopensAt ? describeWhen(reopensAt, now, lang, CAFE_TZ) : null;
  const timing =
    prepMinutes > 0
      ? t.order.pickupReadyIn.replace('{min}', String(prepMinutes))
      : t.order.pickupReadyNow;

  return (
    <Stack
      spacing={0.25}
      data-testid="ordering-state"
      data-open={open ? 'true' : 'false'}
      sx={{
        mt: 2.5,
        p: 1.75,
        borderRadius: `${radius.lg}px`,
        backgroundColor: open ? brand.matchaTint : brand.limewashTint,
      }}
    >
      <Typography variant="h6" component="p" sx={{ color: brand.ink70 }}>
        {t.order.pickupTitle}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {open ? t.order.pickupNow : t.order.closedNow.replace('{min}', String(ORDER_CUTOFF_MIN))}
      </Typography>
      {!open && reopenLabel && (
        <Typography variant="caption" sx={{ color: brand.ink70 }}>
          {t.order.reopensAt.replace('{when}', reopenLabel)}
        </Typography>
      )}
      {open && (
        <Typography variant="caption" sx={{ color: brand.ink70 }}>
          {timing}
        </Typography>
      )}
    </Stack>
  );
}

/** Why the pay button became a sign-in button: orders go on an account. */
function SignInNote() {
  const { t } = useLanguage();
  return (
    <Stack
      spacing={0.5}
      data-testid="cart-sign-in-note"
      sx={{ mt: 2.5, p: 1.75, borderRadius: `${radius.lg}px`, backgroundColor: brand.roseWash }}
    >
      <Typography variant="h6" component="p">
        {t.order.signInTitle}
      </Typography>
      <Typography variant="body2" sx={{ color: brand.ink70 }}>
        {t.order.signInBody}
      </Typography>
    </Stack>
  );
}

/** One rounded, label-inside field — the whole form is a couple of these. */
function Field({
  label,
  value,
  onChange,
  type,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <TextField
      required={required}
      type={type}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      slotProps={{ input: { sx: { borderRadius: `${radius.md}px`, backgroundColor: brand.white } } }}
    />
  );
}

