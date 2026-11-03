'use client';

import { useEffect } from 'react';

/**
 * Left on a TV for weeks, the page would otherwise keep showing whatever it
 * loaded first. Once a minute it reads the live page and reloads itself only
 * when the picture on it has changed, so a new poster reaches the screen
 * without anyone touching the TV (and a failed check changes nothing).
 */
export function ReloadOnChange({ poster }: { poster: string }) {
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(window.location.href, { cache: 'no-store' });
        if (!res.ok) return;
        const live = (await res.text()).match(/\/media\/display\/[\w.-]+\.(?:jpe?g|png|webp)/)?.[0];
        if (live && live !== poster) window.location.reload();
      } catch {
        // Offline: keep showing the picture.
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [poster]);
  return null;
}
