'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CartLine } from '../types';
import { loadCart, saveCart, clearCart as clearStored } from '../lib/cartStorage';

export interface CartApi {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  addLine: (line: CartLine) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

/** Cart state persisted to localStorage so an accidental refresh keeps the order. */
export function useCart(): CartApi {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(loadCart());
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    saveCart(next);
  }, []);

  const addLine = useCallback(
    (line: CartLine) => persist([...lines, line]),
    [lines, persist],
  );

  const updateQuantity = useCallback(
    (lineId: string, quantity: number) => {
      if (quantity <= 0) {
        persist(lines.filter((l) => l.lineId !== lineId));
      } else {
        persist(lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)));
      }
    },
    [lines, persist],
  );

  const removeLine = useCallback(
    (lineId: string) => persist(lines.filter((l) => l.lineId !== lineId)),
    [lines, persist],
  );

  const clear = useCallback(() => {
    setLines([]);
    clearStored();
  }, []);

  const { count, subtotalCents } = useMemo(
    () => ({
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotalCents: lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0),
    }),
    [lines],
  );

  return { lines, count, subtotalCents, addLine, updateQuantity, removeLine, clear };
}
