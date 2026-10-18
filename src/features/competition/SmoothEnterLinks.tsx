'use client';

import { useEffect } from 'react';

/**
 * "Enter now" and step 2 are plain #enter links, so they work before the page
 * hydrates. Once it has, glide to the form instead of jumping, and leave the
 * address alone — no "#enter" tacked onto the URL people may copy or share.
 */
export function SmoothEnterLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href="#enter"]');
      const form = document.getElementById('enter');
      if (!link || !form) return;
      event.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
