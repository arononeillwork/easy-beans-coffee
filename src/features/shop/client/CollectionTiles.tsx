'use client';

import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import type { RetailCollectionSlug } from '@/features/order/types';
import { brand, motion, radius } from '@/theme/brand';
import { COLLECTION_HERO } from '../assets';
import { BrandPanel } from './BrandPanel';

/** Maps a collection slug onto its i18n key. */
const COPY_KEY: Record<RetailCollectionSlug, 'beans' | 'matchaChai' | 'bundles'> = {
  beans: 'beans',
  'matcha-chai': 'matchaChai',
  'gift-sets': 'bundles',
};

interface Props {
  collections: RetailCollectionSlug[];
}

/** Entry tiles into each collection, in the Chamberlain category-grid pattern. */
export function CollectionTiles({ collections }: Props) {
  const { t, lang } = useLanguage();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: { xs: 2.5, md: 3 },
      }}
    >
      {collections.map((slug) => {
        const copy = t.shop.categories[COPY_KEY[slug]];
        return (
          <Box
            key={slug}
            component={Link}
            href={localePath(lang, `/shop/${slug}`)}
            sx={{
              textDecoration: 'none',
              color: 'text.primary',
              '&:hover .eb-tile-image': { transform: 'scale(1.03)' },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '4 / 5',
                overflow: 'hidden',
                borderRadius: `${radius.lg}px`,
                backgroundColor: brand.roseWash,
              }}
            >
              {COLLECTION_HERO[slug] ? (
                <Image
                  className="eb-tile-image"
                  src={COLLECTION_HERO[slug]!}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 100vw, 33vw"
                  style={{
                    objectFit: 'cover',
                    transition: `transform ${motion.base} ${motion.easeOutSoft}`,
                  }}
                />
              ) : (
                <BrandPanel tintKey={slug} />
              )}
            </Box>
            <Stack spacing={0.5} sx={{ pt: 2 }}>
              <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep }}>
                {copy.tagline}
              </Typography>
              <Typography variant="h4">{copy.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {copy.blurb}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
