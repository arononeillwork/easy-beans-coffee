'use client';

import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useMenu } from '@/features/order/hooks/useMenu';
import { ProductDetail } from './ProductDetail';
import { shopCollections } from '../retail';
import type { RetailCollectionSlug } from '@/features/order/types';

/**
 * Product page resolved in the browser.
 *
 * Only reached when the server had no catalog to prerender from — Square
 * unreachable, or not configured at all. The same fallback /shop and /order
 * use, kept so a page that cannot be built on the server still fills itself in
 * rather than showing placeholder stock.
 */
export function ProductFallback({
  collection,
  handle,
}: {
  collection: RetailCollectionSlug;
  handle: string;
}) {
  const { t } = useLanguage();
  const { menu, loading } = useMenu();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="secondary" aria-label={t.shop.eyebrow} />
      </Box>
    );
  }

  const shop = shopCollections(menu);
  const category = shop.categories.find((c) => c.retailSlug === collection);
  const item = category?.items.find((i) => i.slug === handle);
  if (!item) notFound();

  const related = (category?.items ?? []).filter((i) => i.id !== item.id).slice(0, 4);

  return (
    <ProductDetail
      item={item}
      collection={collection}
      related={related}
      isPlaceholder={shop.isPlaceholder}
    />
  );
}
