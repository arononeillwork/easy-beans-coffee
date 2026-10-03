'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import type { MenuItem, RetailCollectionSlug } from '@/features/order/types';
import { ProductCard } from './ProductCard';

/** A product always carries its own collection so its link is correct even in a mixed grid. */
export interface ProductEntry {
  item: MenuItem;
  collection: RetailCollectionSlug;
}

interface Props {
  entries: ProductEntry[];
  columns?: { xs: string; md: string };
}

export function ProductGrid({
  entries,
  columns = { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
}: Props) {
  const { t } = useLanguage();

  if (entries.length === 0) {
    return <Typography color="text.secondary">{t.shop.empty}</Typography>;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: columns.xs, md: columns.md },
        gap: { xs: 2.5, md: 3.5 },
        alignItems: 'stretch',
      }}
    >
      {entries.map(({ item, collection }) => (
        <ProductCard key={item.id} item={item} collection={collection} />
      ))}
    </Box>
  );
}
