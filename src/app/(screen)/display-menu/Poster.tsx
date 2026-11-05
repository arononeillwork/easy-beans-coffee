'use client';

import { useEffect, useState } from 'react';

/**
 * The TV's picture, filling the vertical screen. A TV turned on its side often
 * still sends the browser a landscape picture: then the whole screen is turned
 * a quarter so it stands upright on the turned TV. If it comes out upside down,
 * a press of OK (or a click) turns it the other way, and the TV remembers.
 *
 * A poster made for the screen fills it edge to edge. An Instagram post
 * (`post`), square or 4:5 against the screen's 9:16, is shown whole instead,
 * on a softened, enlarged copy of itself so there are no bars, with whatever
 * the page passes as children just under it.
 */
// The café TV turns clockwise (seen from the front), so the screen turns the other way by default.
const FLIP = 'eb-display-flip-2';
// --u is 1% of the upright screen's width, whichever way the TV sends it.
const CSS = `
.eb-screen{position:absolute;inset:0;overflow:hidden;--u:1vw}
@media (orientation: landscape){
  .eb-screen{inset:auto;top:50%;left:50%;width:100vh;height:100vw;transform:translate(-50%,-50%) rotate(90deg);--u:1vh}
  .eb-screen.eb-flip{transform:translate(-50%,-50%) rotate(-90deg)}
}
.eb-fill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.eb-backdrop{filter:blur(calc(var(--u) * 6)) saturate(1.2) brightness(.92);transform:scale(1.3)}
.eb-stack{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u) * 5)}
.eb-post{display:block;width:100%;height:auto;min-height:0;max-height:calc(100% - var(--u) * 24);object-fit:contain;box-shadow:0 calc(var(--u) * 1.5) calc(var(--u) * 6) rgba(59,42,32,.35)}`;

export function Poster({
  src,
  alt,
  post = false,
  children,
}: {
  src: string;
  alt: string;
  post?: boolean;
  children?: React.ReactNode;
}) {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    try { setFlip(localStorage.getItem(FLIP) === '1'); } catch { /* no storage: as is */ }
    const turn = () => setFlip((f) => {
      try { localStorage.setItem(FLIP, f ? '0' : '1'); } catch { /* no storage: this time only */ }
      return !f;
    });
    const onKey = (e: KeyboardEvent) => { if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) turn(); };
    window.addEventListener('click', turn);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('click', turn); window.removeEventListener('keydown', onKey); };
  }, []);
  /* eslint-disable @next/next/no-img-element -- one full-screen picture, shown as it is */
  return (
    <div className={flip ? 'eb-screen eb-flip' : 'eb-screen'}>
      <style>{CSS}</style>
      {post ? (
        <>
          <img className="eb-fill eb-backdrop" src={src} alt="" aria-hidden />
          <div className="eb-stack">
            <img className="eb-post" src={src} alt={alt} data-testid="screen-picture" />
            {children}
          </div>
        </>
      ) : (
        <img className="eb-fill" src={src} alt={alt} data-testid="screen-picture" />
      )}
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}
