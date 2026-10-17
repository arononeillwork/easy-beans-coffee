'use client';

import Box from '@mui/material/Box';
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
import { EmailSignupForm } from '@/components/home/EmailSignupForm';

/**
 * Shop landing. Stock comes from Square, prerendered by the route: put an item
 * in a retail category there ("Coffee beans", "Matcha", "Gift sets") and it
 * appears here. Until Square has any, the page is "coming soon" and an email
 * signup (tagged shop_page) — it never shows sample products to customers.
 */
export function ShopView({ initialMenu }: { initialMenu: MenuResponse | null }) {
  const { t } = useLanguage();
  const { menu, loading } = useMenu(initialMenu);

  const shop = shopCollections(menu);
  const collections = shop.categories;
  const featured = collections
    .flatMap((category) =>
      category.retailSlug ? category.items.map((item) => ({ item, collection: category.retailSlug! })) : [],
    )
    .filter(({ item }) => item.badge !== undefined)
    .slice(0, 4);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 9, md: 14 } }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="secondary" aria-label={t.shop.eyebrow} />
        </Box>
      ) : shop.isPlaceholder ? (
        <Box data-testid="shop-coming-soon" sx={{ maxWidth: 560 }}>
          <Typography variant="h1" sx={{ fontSize: { xs: 'clamp(3rem, 14vw, 4.5rem)', md: 'clamp(4.5rem, 7vw, 6.5rem)' }, lineHeight: 0.95, letterSpacing: '-0.045em' }}>
            {t.shop.soonTitle}
          </Typography>
          <Typography sx={{ mt: { xs: 2.5, md: 3 }, mb: { xs: 3, md: 4 }, fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70 }}>
            {t.shop.comingSoon}
          </Typography>
          <EmailSignupForm source="shop_page" cta={t.shop.soonCta} done={t.shop.soonDone} />
        </Box>
      ) : (
        <>
          <Typography variant="h1" sx={{ fontSize: { xs: 'clamp(2.75rem, 12vw, 4rem)', md: 'clamp(4rem, 6.5vw, 6rem)' }, lineHeight: 0.96, letterSpacing: '-0.045em', maxWidth: '10ch' }}>
            {t.shop.headline}
          </Typography>
          <Typography sx={{ mt: { xs: 3, md: 4 }, fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70, maxWidth: '40ch' }}>
            {t.shop.body}
          </Typography>
          <Box sx={{ mt: { xs: 6, md: 9 } }}>
            <CollectionTiles collections={collections.flatMap((c) => (c.retailSlug ? [c.retailSlug] : []))} />
          </Box>
          {featured.length > 0 && (
            <Box sx={{ mt: { xs: 8, md: 12 } }}>
              <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
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
  );
}
