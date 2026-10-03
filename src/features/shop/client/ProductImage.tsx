'use client';

import Image from 'next/image';
import type { MenuItem } from '@/features/order/types';
import { motion } from '@/theme/brand';
import { BrandPanel } from './BrandPanel';

interface Props {
  item: MenuItem;
  sizes: string;
  /** Collection photography, used when Square has no shot for this item. */
  fallbackSrc?: string;
  priority?: boolean;
}

/**
 * Product imagery with a graceful ladder: the Square catalog image, then the
 * collection's photograph, then the brand panel. Packaging photography does
 * not exist yet, so the last rung is load-bearing.
 */
export function ProductImage({ item, sizes, fallbackSrc, priority = false }: Props) {
  const src = item.imageUrl ?? fallbackSrc;

  if (!src) return <BrandPanel tintKey={item.id} />;

  return (
    <Image
      className="eb-product-image"
      src={src}
      alt={item.name}
      fill
      sizes={sizes}
      priority={priority}
      style={{
        objectFit: 'cover',
        transition: `transform ${motion.base} ${motion.easeOutSoft}`,
      }}
    />
  );
}
