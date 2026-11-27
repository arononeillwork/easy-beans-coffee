'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath, type Lang } from '@/i18n/config';
import { brand } from '@/theme/brand';

type State = 'idle' | 'sending' | 'member' | 'closed' | 'failed';

/** The account page, coming back to the club page to carry on joining. */
const signInUrl = (lang: Lang) =>
  `${localePath(lang, '/account')}?next=${encodeURIComponent(`${localePath(lang, '/club')}?join=1`)}`;

/** Asks the site for this person's checkout: where to go, or why not. */
async function askToJoin(lang: Lang): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch('/api/account/club/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang }),
    });
    if (res.status === 401) return { error: 'not_signed_in' };
    const body = (await res.json()) as { url?: string; error?: string };
    return res.ok && body.url ? { url: body.url } : { error: body.error ?? 'unavailable' };
  } catch {
    return { error: 'unavailable' };
  }
}

/**
 * "Join the club": signed in, straight to Square's checkout with their email
 * filled in; signed out, to sign in or sign up first and then on. With
 * `resumeAfterSignIn` (the club page) it carries on by itself when they arrive
 * back as `?join=1`.
 */
export function JoinClubButton({ resumeAfterSignIn = false }: { resumeAfterSignIn?: boolean }) {
  const { t, lang } = useLanguage();
  const labels = t.club;
  const [state, setState] = useState<State>('idle');
  const resumed = useRef(false);

  const join = useCallback(
    async (signInIfNeeded: boolean) => {
      setState('sending');
      const answer = await askToJoin(lang);
      if ('url' in answer) {
        window.location.assign(answer.url);
        return;
      }
      if (answer.error === 'not_signed_in') {
        if (signInIfNeeded) window.location.assign(signInUrl(lang));
        else setState('idle');
        return;
      }
      setState(
        answer.error === 'already_a_member' ? 'member' : answer.error === 'not_taking_members' ? 'closed' : 'failed',
      );
    },
    [lang],
  );

  useEffect(() => {
    if (!resumeAfterSignIn || resumed.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('join') !== '1') return;
    resumed.current = true;
    // Used once: going back from the checkout mustn't send them there again.
    url.searchParams.delete('join');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    // Never back to sign-in by itself, so a session that didn't take can't loop.
    void join(false);
  }, [resumeAfterSignIn, join]);

  // "Back" from the checkout can restore this page as it was left, mid-send.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setState('idle');
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  if (state === 'member') {
    return (
      <Box role="status">
        <Typography sx={{ fontWeight: 500, mb: 1.5 }}>{labels.member}</Typography>
        {/* A full load, so on the account page itself the pass is read afresh. */}
        <Button variant="contained" href={localePath(lang, '/account')}>
          {labels.seePass}
        </Button>
      </Box>
    );
  }
  if (state === 'closed') {
    return (
      <Typography role="status" sx={{ fontWeight: 500 }}>
        {labels.closed}
      </Typography>
    );
  }
  return (
    <Box>
      <Button
        variant="contained"
        size="large"
        data-testid="club-join"
        disabled={state === 'sending'}
        onClick={() => void join(true)}
      >
        {state === 'sending' ? labels.joining : labels.join}
      </Button>
      {state === 'failed' && (
        <Typography role="alert" sx={{ color: brand.rosePinkDeep, fontSize: '0.875rem', mt: 1.5 }}>
          {labels.failed}
        </Typography>
      )}
    </Box>
  );
}
