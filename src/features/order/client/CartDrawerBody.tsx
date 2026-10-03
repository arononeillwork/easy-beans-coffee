'use client';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand, radius } from '@/theme/brand';
import { CartPanel } from './CartPanel';
import { useCartContext } from './CartProvider';

/**
 * Drawer contents, split from CartDrawer so this module — and the MUI Drawer
 * and checkout form it pulls in — is only fetched once the cart is opened.
 *
 * The shell owns the header and the scroll boundary; CartPanel fills the rest
 * and pins its own total-and-pay bar to the bottom.
 */
export function CartDrawerBody() {
  const { t } = useLanguage();
  const cart = useCartContext();
  const count = cart.count;

  return (
    <Drawer
      anchor="right"
      open={cart.open}
      onClose={cart.closeCart}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: brand.white,
            borderTopLeftRadius: { xs: 0, sm: radius.xl },
            borderBottomLeftRadius: { xs: 0, sm: radius.xl },
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 2 }}
      >
        <Box>
          <Typography variant="h4">{t.order.cart}</Typography>
          {count > 0 && (
            <Typography variant="caption" sx={{ color: brand.ink45 }}>
              {count === 1 ? t.order.itemCountOne : t.order.itemCount.replace('{n}', String(count))}
            </Typography>
          )}
        </Box>
        <IconButton aria-label={t.popup.close} onClick={cart.closeCart} sx={{ color: brand.ink70 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <CartPanel cart={cart} />
    </Drawer>
  );
}
