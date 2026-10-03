'use client';

import { useEffect, useState } from 'react';
import type { MenuResponse } from '../types';

interface MenuState {
  menu: MenuResponse | null;
  loading: boolean;
  error: boolean;
}

/**
 * The normalized Square catalog for a browsing UI.
 *
 * Pages pass `initialMenu` from their server component, which is where the
 * catalog should come from: the HTML then ships with the products already in
 * it and the visitor never sees a spinner. The client fetch is the fallback
 * for the one case the server cannot cover — Square unreachable or
 * unconfigured at prerender time, where `getCatalogOrNull()` yields null and
 * the page must still fill in on its own.
 */
export function useMenu(initialMenu?: MenuResponse | null): MenuState & { retry: () => void } {
  const hasInitial = initialMenu != null;
  const [state, setState] = useState<MenuState>(
    hasInitial
      ? { menu: initialMenu, loading: false, error: false }
      : { menu: null, loading: true, error: false },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Prerendered catalog: the data is already here, so the initial pass has
    // nothing to fetch. `retry` bumps `attempt` and still forces a real fetch.
    if (hasInitial && attempt === 0) return;

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));

    fetch('/api/menu')
      .then(async (res) => {
        if (!res.ok) throw new Error(`menu fetch failed: ${res.status}`);
        const data = (await res.json()) as MenuResponse;
        if (!cancelled) setState({ menu: data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ menu: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, hasInitial]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}
