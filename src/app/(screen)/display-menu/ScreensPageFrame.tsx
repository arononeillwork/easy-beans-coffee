'use client';

import { useEffect, useState } from 'react';

/** Which way this TV turned the poster (Poster's choice, kept on the TV). */
const FLIP = 'eb-display-flip-2';

/**
 * The café TV's screen from the Business Agent, filling the page: whatever is
 * picked on its Screens page (an Instagram post, a picture, the menu) shows here
 * within a minute. The screen is set to portrait there, so it stands upright on
 * the TV by itself, the same way round as the poster was on this TV (?turn=left
 * when the poster was flipped); a tap on the TV turns it the other way.
 */
export function ScreensPageFrame({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let left = false;
    try {
      left = localStorage.getItem(FLIP) === '1';
    } catch {
      // Storage off: the usual way round.
    }
    setSrc(left ? `${link}?turn=left` : link);
  }, [link]);
  if (!src) return null;
  return (
    <iframe
      src={src}
      title="Easy Beans Coffee screen"
      allow="autoplay; fullscreen"
      data-testid="screen-frame"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#000' }}
    />
  );
}
