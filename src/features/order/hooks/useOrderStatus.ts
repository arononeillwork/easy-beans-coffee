'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrderStatusResponse } from '../types';

const POLL_MS = 6000;
const TERMINAL: Array<OrderStatusResponse['status']> = ['collected', 'cancelled', 'failed'];

/** Polls the public status endpoint until the order reaches a terminal state. */
export function useOrderStatus(token: string | null) {
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${token}/status`, { cache: 'no-store' });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (res.ok) {
          const body = (await res.json()) as OrderStatusResponse;
          if (!cancelled) {
            setData(body);
            if (TERMINAL.includes(body.status)) return;
          }
        }
      } catch {
        // Transient network error — next poll retries.
      }
      if (!cancelled) {
        timer.current = window.setTimeout(poll, POLL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [token]);

  return { data, notFound };
}
