'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { useCartContext } from '@/features/order/client/CartProvider';
import { formatEuros } from '@/features/order/lib/price';
import type { MenuItem, RetailCollectionSlug } from '@/features/order/types';
import { brand, radius } from '@/theme/brand';
import { COLLECTION_PHOTO } from '../assets';
import { ProductImage } from './ProductImage';
import { ProductGrid } from './ProductGrid';

interface Props {
  item: MenuItem;
  collection: RetailCollectionSlug;
  related: MenuItem[];
  /** True while the shop is showing placeholder stock rather than Square's. */
  isPlaceholder?: boolean;
}

/**
 * Product page. Variation and modifier handling mirrors ProductDialog on the
 * drinks side — same min/max rules, same CartLine shape — so both surfaces
 * feed one cart and one server-side validation path.
 */
export function ProductDetail({ item, collection, related, isPlaceholder = false }: Props) {
  const { t, lang } = useLanguage();
  const cart = useCartContext();
  const [variationId, setVariationId] = useState(item.variations[0]?.id ?? '');
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const variation = item.variations.find((v) => v.id === variationId);

  const unitPriceCents = useMemo(() => {
    if (!variation) return 0;
    let cents = variation.priceCents;
    for (const group of item.modifierGroups) {
      for (const id of selected[group.id] ?? []) {
        const mod = group.modifiers.find((m) => m.id === id);
        if (mod) cents += mod.priceCents;
      }
    }
    return cents;
  }, [item, variation, selected]);

  const requirementsMet = useMemo(
    () =>
      item.modifierGroups.every((group) => {
        const chosen = (selected[group.id] ?? []).length;
        return chosen >= group.minSelected && chosen <= group.maxSelected;
      }),
    [item, selected],
  );

  const toggleModifier = (groupId: string, modifierId: string, single: boolean, max: number) => {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (single) {
        return { ...prev, [groupId]: current[0] === modifierId ? [] : [modifierId] };
      }
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      if (current.length >= max) return prev;
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  };

  const add = () => {
    if (!variation || !requirementsMet) return;
    const modifierIds = item.modifierGroups.flatMap((g) => selected[g.id] ?? []);
    const modifierNames = item.modifierGroups.flatMap((g) =>
      (selected[g.id] ?? []).map((id) => g.modifiers.find((m) => m.id === id)?.name ?? ''),
    );
    cart.addLine({
      lineId: crypto.randomUUID(),
      itemId: item.id,
      itemName: item.name,
      variationId: variation.id,
      variationName: variation.name,
      modifierIds,
      modifierNames,
      quantity,
      unitPriceCents,
      kind: item.kind,
      imageUrl: item.imageUrl ?? COLLECTION_PHOTO[collection],
    });
    cart.openCart();
  };

  const onSale = item.compareAtCents !== undefined && item.compareAtCents > unitPriceCents;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <Box
        component={Link}
        href={localePath(lang, `/shop/${collection}`)}
        sx={{ display: 'inline-block', mb: 4, color: brand.rosePinkDeep, fontSize: '0.9375rem' }}
      >
        ← {t.shop.product.back}
      </Box>

      <Grid container spacing={{ xs: 4, md: 8 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '1',
              overflow: 'hidden',
              borderRadius: `${radius.lg}px`,
              backgroundColor: brand.roseWash,
            }}
          >
            <ProductImage
              item={item}
              sizes="(max-width: 900px) 100vw, 50vw"
              fallbackSrc={COLLECTION_PHOTO[collection]}
              priority
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {item.badge && (
            <Chip
              label={t.shop.badges[item.badge]}
              size="small"
              sx={{
                mb: 2,
                backgroundColor: brand.rosePinkTint,
                color: brand.ink,
                fontSize: '0.6875rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            />
          )}
          <Typography variant="h2" sx={{ mb: 1.5 }}>
            {item.name}
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 3 }}>
            <Typography variant="h5" component="p">
              {formatEuros(unitPriceCents, lang)}
            </Typography>
            {onSale && (
              <Typography sx={{ color: brand.ink45, textDecoration: 'line-through' }}>
                {formatEuros(item.compareAtCents!, lang)}
              </Typography>
            )}
          </Stack>

          {item.variations.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" component="p" sx={{ mb: 1 }}>
                {t.shop.product.size}
              </Typography>
              <RadioGroup value={variationId} onChange={(e) => setVariationId(e.target.value)}>
                {item.variations.map((v) => (
                  <FormControlLabel
                    key={v.id}
                    value={v.id}
                    control={<Radio size="small" />}
                    label={
                      <Stack direction="row" spacing={1.5} alignItems="baseline">
                        <span>{v.name}</span>
                        <Typography variant="body2" color="text.secondary">
                          {formatEuros(v.priceCents, lang)}
                        </Typography>
                      </Stack>
                    }
                  />
                ))}
              </RadioGroup>
            </Box>
          )}

          {item.modifierGroups.map((group) => {
            const single = group.maxSelected === 1;
            const chosen = selected[group.id] ?? [];
            return (
              <Box key={group.id} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="h6" component="p">
                    {group.name}
                  </Typography>
                  {group.required && (
                    <Chip label={t.order.required} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                  )}
                </Stack>
                <Stack>
                  {group.modifiers.map((mod) => (
                    <FormControlLabel
                      key={mod.id}
                      control={
                        single ? (
                          <Radio
                            size="small"
                            checked={chosen.includes(mod.id)}
                            onClick={() => toggleModifier(group.id, mod.id, true, group.maxSelected)}
                          />
                        ) : (
                          <Checkbox
                            size="small"
                            checked={chosen.includes(mod.id)}
                            onChange={() => toggleModifier(group.id, mod.id, false, group.maxSelected)}
                          />
                        )
                      }
                      label={
                        <Stack direction="row" spacing={1.5} alignItems="baseline">
                          <span>{mod.name}</span>
                          {mod.priceCents > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              +{formatEuros(mod.priceCents, lang)}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3, mb: 4 }}>
            <Stack
              direction="row"
              alignItems="center"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: `${radius.pill}px` }}
            >
              <IconButton
                aria-label="-"
                size="small"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ px: 1.5 }} aria-label={t.shop.product.quantity}>
                {quantity}
              </Typography>
              <IconButton aria-label="+" size="small" onClick={() => setQuantity((q) => q + 1)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Button
              variant="contained"
              fullWidth
              disabled={item.soldOut || isPlaceholder || !requirementsMet || !variation}
              onClick={add}
            >
              {item.soldOut
                ? t.shop.card.soldOut
                : `${t.shop.product.add} · ${formatEuros(unitPriceCents * quantity, lang)}`}
            </Button>
          </Stack>

          {isPlaceholder && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {t.shop.placeholderNotice}
            </Alert>
          )}

          {item.description && (
            <DetailPanel title={t.shop.product.description} defaultExpanded>
              {item.description}
            </DetailPanel>
          )}
          <DetailPanel title={t.shop.product.collection}>{t.shop.collectNote}</DetailPanel>
        </Grid>
      </Grid>

      {related.length > 0 && (
        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          <Typography variant="h3" sx={{ mb: 3 }}>
            {t.shop.product.related}
          </Typography>
          <ProductGrid entries={related.map((r) => ({ item: r, collection }))} />
        </Box>
      )}
    </Container>
  );
}

function DetailPanel({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      disableGutters
      square
      defaultExpanded={defaultExpanded}
      sx={{
        backgroundColor: 'transparent',
        borderTop: `1px solid ${brand.ink12}`,
        '&:last-of-type': { borderBottom: `1px solid ${brand.ink12}` },
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
        <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
        <Typography color="text.secondary">{children}</Typography>
      </AccordionDetails>
    </Accordion>
  );
}
