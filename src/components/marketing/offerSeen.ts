/**
 * Whether this browser has already been shown the newsletter subscribe offer.
 *
 * Two places open the same dialog — the first-visit popup and the announcement
 * bar — so the flag lives here rather than in either of them. Reading it is
 * guarded because the value is only ever meaningful in the browser.
 */
const SEEN_KEY = 'ebc:popup-seen';

export function hasSeenOffer(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // Private mode and blocked storage both throw. Treat as "not seen": showing
    // the offer twice is a smaller failure than never showing it.
    return false;
  }
}

export function markOfferSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    /* nothing to do — the offer simply shows again next visit */
  }
}
