'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCart, type CartApi } from '../hooks/useCart';

interface CartContextValue extends CartApi {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * One cart for the whole site. Drinks from /order and packaged goods from
 * /shop share it, so a bag of beans and a flat white check out together —
 * they are collected from the same counter either way.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);

  // `?cart=open` reopens the cart: where sign-in sends a customer back to
  // after the cart asked them to sign in. Read once, then swept from the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('cart') !== 'open') return;
    setOpen(true);
    url.searchParams.delete('cart');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...cart,
      open,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
    }),
    [cart, open],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used inside CartProvider');
  return ctx;
}
