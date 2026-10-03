'use client';

import Link from 'next/link';
import Image from 'next/image';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { useMenu } from '@/features/order/hooks/useMenu';
import { ProductGrid } from './ProductGrid';
import { ShopFaq } from './ShopFaq';
import { BrandPanel } from './BrandPanel';
import { COLLECTION_HERO } from '../assets';
import { shopCollections } from '../retail';
import type { MenuResponse, RetailCollectionSlug } from '@/features/order/types';
import { brand, radius } from '@/theme/brand';

const COPY_KEY: Record<RetailCollectionSlug, 'beans' | 'matchaChai' | 'bundles'> = {
  beans: 'beans',
  'matcha-chai': 'matchaChai',
  'gift-sets': 'bundles',
};

/**
 * Collection body. The slug is validated and the stock prerendered by the
 * route above; this stays a client component because the grid is interactive
 * (quick-add), not because the products need fetching.
 */
export function CollectionView({
  slug,
  initialMenu,
}: {
  slug: RetailCollectionSlug;
  initialMenu: MenuResponse | null;
}) {
  const { t, lang } = useLanguage();
  const { menu, loading, error, retry } = useMenu(initialMenu);

  const copy = t.shop.categories[COPY_KEY[slug]];
  const shop = shopCollections(menu);
  const category = shop.categories.find((c) => c.retailSlug === slug);
  const entries = (category?.items ?? []).map((item) => ({ item, collection: slug }));

  return (
    <>
      <Box sx={{ backgroundColor: brand.roseWash }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Box
            component={Link}
            href={localePath(lang, '/shop')}
            sx={{ display: 'inline-block', mb: 3, color: brand.rosePinkDeep, fontSize: '0.9375rem' }}
          >
            ← {t.shop.all}
          </Box>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 3, md: 6 }}
            alignItems={{ md: 'center' }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 1.5 }}>
                {copy.tagline}
              </Typography>
              <Typography variant="h1" sx={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', mb: 2 }}>
                {copy.name}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: '48ch' }}>
                {copy.blurb}
              </Typography>
            </Box>
            <Box
              sx={{
                position: 'relative',
                width: { xs: '100%', md: 360 },
                aspectRatio: '4 / 3',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: `${radius.lg}px`,
              }}
            >
              {COLLECTION_HERO[slug] ? (
                <Image
                  src={COLLECTION_HERO[slug]!}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 360px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <BrandPanel tintKey={slug} />
              )}
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress color="secondary" aria-label={copy.name} />
          </Box>
        ) : (
          <>
            {shop.isPlaceholder && (
              <Alert
                severity="info"
                sx={{ mb: 4 }}
                action={
                  error ? (
                    <Button onClick={retry} size="small" color="inherit">
                      ↻
                    </Button>
                  ) : undefined
                }
              >
                {t.shop.placeholderNotice}
              </Alert>
            )}
            <ProductGrid entries={entries} />
          </>
        )}

        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          <ShopFaq />
        </Box>
      </Container>
    </>
  );
}
