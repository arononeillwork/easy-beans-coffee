'use client';

import { useEffect, useState } from 'react';

/**
 * The vertical poster, filling the screen. A TV turned on its side often still
 * sends the browser a landscape picture: then the poster is turned a quarter so
 * it stands upright on the turned screen. If it comes out upside down, a press
 * of OK (or a click) turns it the other way, and the TV remembers.
 */
const FLIP = 'eb-display-flip';
const CSS = `
.eb-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
@media (orientation: landscape){
  .eb-poster{inset:auto;top:50%;left:50%;width:100vh;height:100vw;transform:translate(-50%,-50%) rotate(-90deg)}
  .eb-poster.eb-flip{transform:translate(-50%,-50%) rotate(90deg)}
}`;

export function Poster({ src, alt }: { src: string; alt: string }) {
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
  return (
    <>
      <style>{CSS}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- one full-screen picture, shown as it is */}
      <img className={flip ? 'eb-poster eb-flip' : 'eb-poster'} src={src} alt={alt} />
    </>
  );
}
