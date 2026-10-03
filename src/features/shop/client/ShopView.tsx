'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useMenu } from '@/features/order/hooks/useMenu';
import { CollectionTiles } from '@/features/shop/client/CollectionTiles';
import { ProductGrid } from '@/features/shop/client/ProductGrid';
import { ShopFaq } from '@/features/shop/client/ShopFaq';
import { shopCollections } from '@/features/shop/retail';
import type { MenuResponse } from '@/features/order/types';
import { brand } from '@/theme/brand';

/**
 * Shop landing body: collection tiles, a featured row, then the FAQ. Stock
 * arrives prerendered from the route, so the tiles and prices are in the
 * first paint; the spinner is only for the Square-unreachable fallback.
 */
export function ShopView({ initialMenu }: { initialMenu: MenuResponse | null }) {
  const { t } = useLanguage();
  const { menu, loading, error, retry } = useMenu(initialMenu);

  const shop = shopCollections(menu);
  const collections = shop.categories;
  const featured = collections
    .flatMap((category) =>
      category.retailSlug
        ? category.items.map((item) => ({ item, collection: category.retailSlug! }))
        : [],
    )
    .filter(({ item }) => item.badge !== undefined)
    .slice(0, 4);

  return (
    <>
      <Box sx={{ backgroundColor: brand.roseWash }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
            {t.shop.eyebrow}
          </Typography>
          <Typography variant="h1" sx={{ maxWidth: '16ch', mb: 3, textWrap: 'balance' }}>
            {t.shop.headline}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: '52ch', mb: 2 }}>
            {t.shop.body}
          </Typography>
          <Typography variant="body2" sx={{ color: brand.rosePinkDeep }}>
            {t.shop.collectNote}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress color="secondary" aria-label={t.shop.eyebrow} />
          </Box>
        ) : (
          <>
            {shop.isPlaceholder && (
              <Alert
                severity="info"
                sx={{ mb: 5 }}
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

            <CollectionTiles
              collections={collections.flatMap((c) => (c.retailSlug ? [c.retailSlug] : []))}
            />

            {featured.length > 0 && (
              <Box sx={{ mt: { xs: 8, md: 12 } }}>
                <Typography variant="h3" sx={{ mb: 3 }}>
                  {t.shop.featured}
                </Typography>
                <ProductGrid entries={featured} />
              </Box>
            )}

            <Box sx={{ mt: { xs: 8, md: 12 } }}>
              <ShopFaq />
            </Box>
          </>
        )}
      </Container>
    </>
  );
}
