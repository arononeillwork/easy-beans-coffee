'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCartContext } from './CartProvider';

/**
 * The drawer's contents — MUI's Drawer, the pickup-slot picker and the whole
 * checkout form — are a large chunk of JS that sits in the layout of every
 * page. Almost no visit opens the cart, so the code is fetched on the first
 * open instead of being part of every initial page load.
 */
const CartDrawerBody = dynamic(() => import('./CartDrawerBody').then((m) => m.CartDrawerBody));

/** Site-wide cart drawer, opened from the header or any add-to-cart button. */
export function CartDrawer() {
  const cart = useCartContext();
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (cart.open) setEverOpened(true);
  }, [cart.open]);

  // Before the first open there is nothing to render and nothing to download.
  // Once loaded the drawer stays mounted, so closing and reopening is instant.
  if (!everOpened) return null;

  return <CartDrawerBody />;
}
