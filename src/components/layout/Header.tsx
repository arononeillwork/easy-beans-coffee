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
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeOutlinedIcon from '@mui/icons-material/CoffeeOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import logo from '@/assets/logo.png';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { useCartContext } from '@/features/order/client/CartProvider';
import { brand } from '@/theme/brand';
import { LangToggle } from './LangToggle';

const NAV = [
  // Browsing and ordering are one screen at /order; "Carta" is the word
  // people look for, and the jug on the right is the way back to the order.
  { href: '/order', key: 'menu' },
  { href: '/shop', key: 'shop' },
  { href: '/about', key: 'story' },
  { href: '/#visit', key: 'findUs' },
] as const;

export function Header() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const cart = useCartContext();

  return (
    <AppBar
      position="sticky"
      color="transparent"
      sx={{
        backgroundColor: 'rgba(247, 236, 228, 0.92)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', gap: { xs: 1, md: 2 }, minHeight: { xs: 64, md: 76 } }}>
        <IconButton
          edge="start"
          aria-label="Menu"
          onClick={() => setOpen(true)}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          component={Link}
          href={localePath(lang, '/')}
          aria-label="Easy Beans Coffee"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            // The roundel already carries the wordmark, so it stands in for the
            // text lockup — but only if it is big enough to read the type inside.
            '& img': { height: { xs: 44, sm: 52 }, width: 'auto' },
          }}
        >
          <Image src={logo} alt="" width={52} height={52} priority />
          {/* The name beside the roundel on wide screens; the roundel alone
              on phones, where the header has no room for both. */}
          <Box
            component="span"
            sx={{
              display: { xs: 'none', md: 'inline' },
              ml: 1.5,
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: '1.25rem',
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

        <LangToggle />

        <IconButton
          aria-label={t.nav.account}
          size="small"
          component={Link}
          href={localePath(lang, '/account')}
        >
          <PersonOutlineRoundedIcon />
        </IconButton>

        {/* The jug is the order: it counts up as drinks go in, and opens the
            cart. It replaced a "Pedir" button that duplicated the Carta link —
            at a café you don't press "order", you carry your jug to the till. */}
        <IconButton aria-label={t.order.cart} onClick={cart.openCart}>
          <Badge badgeContent={cart.count} color="primary">
            <CoffeeOutlinedIcon />
          </Badge>
        </IconButton>
      </Toolbar>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 2 }} role="presentation">
          <IconButton aria-label="Close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
          <List>
            <ListItemButton
              component={Link}
              href={localePath(lang, '/order')}
              onClick={() => setOpen(false)}
            >
              <ListItemText primary={t.nav.orderCta} primaryTypographyProps={{ fontWeight: 400 }} />
            </ListItemButton>
            {NAV.map((item) => (
              <ListItemButton
                key={item.key}
                component={Link}
                href={localePath(lang, item.href)}
                onClick={() => setOpen(false)}
              >
                <ListItemText primary={t.nav[item.key]} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
