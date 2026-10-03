import type { CartLine } from '../types';

const STORAGE_KEY = 'ebc:cart:v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredCart {
  lines: CartLine[];
  savedAt: number;
}

/** Loads a persisted cart, discarding stale or malformed data. */
export function loadCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!Array.isArray(parsed.lines)) return [];
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.lines.filter(
      (line) =>
        typeof line.variationId === 'string' &&
        typeof line.quantity === 'number' &&
        line.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (lines.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      const payload: StoredCart = { lines, savedAt: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // Storage full/blocked — cart just won't survive refresh.
  }
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
