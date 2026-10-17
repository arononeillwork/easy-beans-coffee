import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { localePath, type Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { drinkById } from '@/features/menu/drinks';
import { paletteForDrink } from '@/features/menu/palette';
import type { PriceBook } from '@/features/menu/priceBook';
import { normalizeName } from '@/features/shop/retail';
import { brand, radius } from '@/theme/brand';

/**
 * A short run of the menu, as a board: each drink's own photograph on its own
 * colour, its name and today's price from Square. Nothing else — the menu page
 * has the descriptions.
 */
const FEATURED: Array<{ id: string; photo: string }> = [
  { id: 'ube-latte', photo: 'ube-latte/iced-can' },
  { id: 'flat-white', photo: 'flat-white/hot-sit-in' },
  { id: 'matcha-latte', photo: 'matcha-latte/iced-takeaway' },
  { id: 'pink-chai-latte', photo: 'pink-chai-latte/iced-can' },
  { id: 'latte', photo: 'latte/iced-can' },
  { id: 'berry-blast', photo: 'berry-blast/iced-can' },
  { id: 'acai-bowl', photo: 'acai-bowl/na-sit-in' },
  { id: 'cold-brew', photo: 'cold-brew/iced-sit-in' },
];

function fromPrice(book: PriceBook, squareName: string): number | null {
  const item = book.items.find((entry) => entry.key === normalizeName(squareName));
  const cents = item?.variations.map((v) => v.cents).filter((c) => c > 0) ?? [];
  return cents.length ? Math.min(...cents) : null;
}

export function MenuBoard({ t, lang, prices }: { t: SiteContent; lang: Lang; prices: PriceBook }) {
  const euros = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', { style: 'currency', currency: prices.currency || 'EUR' });
  const tiles = FEATURED.flatMap(({ id, photo }) => {
    const drink = drinkById(id);
    if (!drink) return [];
    const cents = fromPrice(prices, drink.square);
    const variants = new Set(prices.items.find((i) => i.key === normalizeName(drink.square))?.variations.map((v) => v.cents));
    return [{ id, photo, name: drink.name[lang], wash: paletteForDrink(drink).wash, cents, many: variants.size > 1 }];
  });

  return (
    <Box component="section" aria-labelledby="board-title" sx={{ pb: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography id="board-title" variant="h2">
            {t.board.title}
          </Typography>
          <Box
            component={Link}
            href={localePath(lang, '/order')}
            sx={{ color: brand.rosePinkDeep, fontWeight: 500, textUnderlineOffset: 4, '&:hover': { color: brand.ink } }}
          >
            {t.board.all}
          </Box>
        </Stack>
      </Container>

      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '64%', sm: '38%', md: 'calc((min(100vw, 1200px) - 48px - 3 * 20px) / 4)' },
          gap: { xs: 1.5, md: 2.5 },
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: { xs: '16px', md: 'max(24px, calc((100vw - 1200px) / 2 + 24px))' },
          px: { xs: 2, md: 'max(24px, calc((100vw - 1200px) / 2 + 24px))' },
          pb: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {tiles.map((tile) => (
          <Box component="li" key={tile.id} sx={{ scrollSnapAlign: 'start' }}>
            <Box
              component={Link}
              href={localePath(lang, '/order')}
              data-testid="board-drink"
              sx={{ display: 'block', color: 'inherit', textDecoration: 'none', '&:hover .board-photo': { transform: 'scale(1.03)' } }}
            >
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '3 / 4',
                  borderRadius: `${radius.lg}px`,
                  overflow: 'hidden',
                  backgroundColor: tile.wash,
                }}
              >
                <Image
                  className="board-photo"
                  src={`/media/drinks/${tile.photo}.webp`}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 64vw, (max-width: 900px) 38vw, 280px"
                  style={{ objectFit: 'cover', mixBlendMode: 'multiply', transition: 'transform 400ms cubic-bezier(.16,1,.3,1)' }}
                />
              </Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontWeight: 500 }}>{tile.name}</Typography>
                {tile.cents !== null && (
                  <Typography data-testid="board-price" sx={{ color: brand.ink70, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {tile.many ? `${t.board.from} ` : ''}
                    {euros.format(tile.cents / 100)}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
