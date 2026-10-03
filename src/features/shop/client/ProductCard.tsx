'use client';

import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { useCartContext } from '@/features/order/client/CartProvider';
import { formatEuros } from '@/features/order/lib/price';
import type { MenuItem, RetailCollectionSlug } from '@/features/order/types';
import { brand, motion, radius } from '@/theme/brand';
import { COLLECTION_PHOTO } from '../assets';
import { isPlaceholderItem } from '../mockCatalog';
import { lowestPriceCents } from '../retail';
import { ProductImage } from './ProductImage';

interface Props {
  item: MenuItem;
  collection: RetailCollectionSlug;
}

/**
 * Product card: image, badge, title, descriptor, price, quick-add — the
 * order a shopper scans them in. Quick-add only fires for single-variation
 * items with no required choices; anything else routes to the product page
 * so the customer picks grind and size deliberately.
 */
export function ProductCard({ item, collection }: Props) {
  const { t, lang } = useLanguage();
  const cart = useCartContext();
  const [added, setAdded] = useState(false);

  const href = localePath(lang, `/shop/${collection}/${item.slug}`);
  const from = lowestPriceCents(item);
  const hasChoices = item.variations.length > 1 || item.modifierGroups.some((g) => g.required);
  const onSale = item.compareAtCents !== undefined && item.compareAtCents > from;
  const placeholder = isPlaceholderItem(item);

  const quickAdd = () => {
    const variation = item.variations[0];
    cart.addLine({
      lineId: crypto.randomUUID(),
      itemId: item.id,
      itemName: item.name,
      variationId: variation.id,
      variationName: variation.name,
      modifierIds: [],
      modifierNames: [],
      quantity: 1,
      unitPriceCents: variation.priceCents,
      kind: item.kind,
      imageUrl: item.imageUrl ?? COLLECTION_PHOTO[collection],
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        '&:hover .eb-product-image': { transform: 'scale(1.03)' },
      }}
    >
      <Box
        component={Link}
        href={href}
        sx={{
          position: 'relative',
          display: 'block',
          aspectRatio: '1',
          overflow: 'hidden',
          borderRadius: `${radius.lg}px`,
          backgroundColor: brand.roseWash,
        }}
      >
        <ProductImage
          item={item}
          sizes="(max-width: 900px) 50vw, 25vw"
          fallbackSrc={COLLECTION_PHOTO[collection]}
        />
        {item.badge && (
          <Chip
            label={t.shop.badges[item.badge]}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: brand.white,
              color: brand.ink,
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          />
        )}
        {item.soldOut && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(247,236,228,0.72)',
            }}
          >
            <Typography variant="h6" component="p">
              {t.shop.card.soldOut}
            </Typography>
          </Box>
        )}
      </Box>

      <Stack spacing={0.75} sx={{ pt: 2, flexGrow: 1 }}>
        <Typography
          component={Link}
          href={href}
          variant="h5"
          sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: brand.rosePinkDeep } }}
        >
          {item.name}
        </Typography>
        {item.description && (
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {item.description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ pt: 0.5 }}>
          <Typography sx={{ fontWeight: 500 }}>
            {hasChoices ? `${t.shop.card.from} ${formatEuros(from, lang)}` : formatEuros(from, lang)}
          </Typography>
          {onSale && (
            <Typography
              variant="body2"
              sx={{ color: brand.ink45, textDecoration: 'line-through' }}
            >
              {formatEuros(item.compareAtCents!, lang)}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Box sx={{ pt: 1.5 }}>
        {item.soldOut ? (
          <Button fullWidth variant="outlined" disabled>
            {t.shop.card.soldOut}
          </Button>
        ) : hasChoices || placeholder ? (
          <Button component={Link} href={href} fullWidth variant="outlined">
            {t.shop.card.add}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={quickAdd}
            sx={{ transition: `background-color ${motion.fast} ${motion.easeStandard}` }}
          >
            {added ? t.shop.card.added : t.shop.card.add}
          </Button>
        )}
      </Box>
    </Box>
  );
}
