'use client';

import { useEffect, useState } from 'react';
import { FirstVisitDialog } from './FirstVisitDialog';
import { hasSeenOffer, markOfferSeen } from './offerSeen';

/**
 * First-visit subscribe offer: the newsletter modal with its 10%-for-6-months
 * shop code. Shows once per browser.
 *
 * The same dialog is also reachable on demand from the announcement bar, which
 * is why the "seen" flag lives in `offerSeen.ts` — signing up through either
 * one has to stop this timer firing on the next visit.
 *
 * The dialog is a separate module but a static import: MUI's Dialog and
 * TextField already reach the browser through the header drawer and the
 * newsletter field, so deferring this one bought no bundle win and only put a
 * chunk fetch between the timer and the offer appearing.
 */
export function FirstVisitPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hasSeenOffer()) return;
    const timer = window.setTimeout(() => setShow(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  // No `onClose`: the dialog closes itself and stays mounted, so nothing here
  // has to track its open state.
  return <FirstVisitDialog onSeen={markOfferSeen} />;
}
