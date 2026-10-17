'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeOutlinedIcon from '@mui/icons-material/CoffeeOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
// Cropped to the roundel itself: the original PNG carries a wide transparent
// margin, which made the logo read smaller than the space it took.
import logo from '@/assets/logo-tight.png';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { useCartContext } from '@/features/order/client/CartProvider';
import { brand } from '@/theme/brand';
import { LangToggle } from './LangToggle';

const NAV = [
  // Browsing and ordering are one screen at /order, labelled "Menú" — not
  // "Carta", which browser translators render as "Letter".
  { href: '/order', key: 'menu', Icon: LocalCafeOutlinedIcon },
  { href: '/shop', key: 'shop', Icon: StorefrontOutlinedIcon },
  { href: '/about', key: 'story', Icon: FavoriteBorderRoundedIcon },
  { href: '/#visit', key: 'findUs', Icon: PlaceOutlinedIcon },
] as const;

/** The phone menu: every page plus the account, each with its icon. */
const DRAWER_NAV = [
  ...NAV,
  { href: '/account', key: 'account', Icon: PersonOutlineRoundedIcon },
] as const;

export function Header() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const cart = useCartContext();
  const close = () => setOpen(false);

  return (
    <AppBar
      position="static"
      color="transparent"
      sx={{
        backgroundColor: 'rgba(247, 236, 228, 0.92)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'none',
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1280,
          width: '100%',
          mx: 'auto',
          gap: { xs: 0.5, md: 2 },
          minHeight: { xs: 72, md: 84 },
        }}
      >
        <Box
          component={Link}
          href={localePath(lang, '/')}
          aria-label="Easy Beans Coffee"
          translate="no"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            // The roundel carries the wordmark, so it is drawn large enough to
            // read the type inside — the phone bar has room now the menu and
            // account live behind the button on the right.
            '& img': { height: { xs: 54, md: 60 }, width: 'auto' },
          }}
        >
          <Image src={logo} alt="" width={60} height={60} priority />
          <Box
            component="span"
            sx={{
              display: { xs: 'none', md: 'inline' },
              ml: 1.75,
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: '1.3rem',
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
            }}
          >
            Easy Beans Coffee
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
          {NAV.map((item) => {
            const href = localePath(lang, item.href);
            const active = pathname === href;
            return (
              <Box
                key={item.key}
                component={Link}
                href={href}
                aria-current={active ? 'page' : undefined}
                sx={{
                  position: 'relative',
                  py: 0.75,
                  textDecoration: 'none',
                  color: 'text.primary',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  '&:hover': { color: brand.rosePinkDeep },
                  '&::after': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: -4,
                        height: '1px',
                        backgroundColor: brand.rosePink,
                      }
                    : undefined,
                }}
              >
                {t.nav[item.key]}
              </Box>
            );
          })}
        </Box>

        <Button
          component={Link}
          href={localePath(lang, '/order')}
          variant="contained"
          size="small"
          sx={{ display: { xs: 'none', md: 'inline-flex' }, ml: 1 }}
        >
          {t.nav.orderCta}
        </Button>

        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <LangToggle />
        </Box>

        <IconButton
          aria-label={t.nav.account}
          size="small"
          component={Link}
          href={localePath(lang, '/account')}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        >
          <PersonOutlineRoundedIcon />
        </IconButton>

        {/* The jug is the order: it counts up as drinks go in, and opens the
            cart. Kept on the bar on phones too — it is the one thing a
            customer mid-order needs without opening the menu. */}
        <IconButton aria-label={t.order.cart} onClick={cart.openCart}>
          <Badge badgeContent={cart.count} color="primary">
            <CoffeeOutlinedIcon />
          </Badge>
        </IconButton>

        {/* Phones: the menu button sits top right, after the cart. */}
        <IconButton
          edge="end"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon sx={{ fontSize: 30 }} />
        </IconButton>
      </Toolbar>

      <Drawer
        anchor="right"
        open={open}
        onClose={close}
        slotProps={{ paper: { sx: { width: 'min(320px, 86vw)', backgroundColor: brand.cream } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box component={Link} href={localePath(lang, '/')} onClick={close} aria-label="Easy Beans Coffee" sx={{ display: 'flex' }}>
              <Image src={logo} alt="" width={44} height={44} />
            </Box>
            <IconButton aria-label={t.popup.close} onClick={close}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List component="nav" aria-label="Menu" sx={{ mx: -1 }}>
            {DRAWER_NAV.map(({ key, href, Icon }) => {
              const to = localePath(lang, href);
              const active = pathname === to;
              return (
                <ListItemButton
                  key={key}
                  component={Link}
                  href={to}
                  onClick={close}
                  aria-current={active ? 'page' : undefined}
                  data-testid={`drawer-${key}`}
                  sx={{
                    borderRadius: 3,
                    py: 1.25,
                    backgroundColor: active ? brand.white : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44, color: brand.rosePinkDeep }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.nav[key]}
                    primaryTypographyProps={{ fontSize: '1.0625rem', fontWeight: 500 }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.ink12}` }}>
            <LangToggle labelled />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            component={Link}
            href={localePath(lang, '/order')}
            onClick={close}
            variant="contained"
            size="large"
            fullWidth
            sx={{ mb: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {t.nav.orderCta}
          </Button>
        </Box>
      </Drawer>
    </AppBar>
  );
}
