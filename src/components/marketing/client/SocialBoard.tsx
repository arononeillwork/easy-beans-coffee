'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import InstagramIcon from '@mui/icons-material/Instagram';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import type { SocialPost, SocialPlatform } from '@/server/social/types';
import { brand, radius } from '@/theme/brand';
import { SectionHeading } from '../SectionHeading';

export type SocialLabels = {
  eyebrow: string;
  handle: string;
  instagram: string;
  tiktok: string;
  note: string;
  empty: string;
  showAll: string;
  viewPost: string;
};

/**
 * The follow-along grid.
 *
 * The two network buttons filter the grid rather than leaving the site — a
 * button is lit when its posts are showing, so "both lit" is the unfiltered
 * state and clicking the only lit one returns you to it. Every tile is itself
 * a link to that post, which is where the outbound clicks live now.
 */
export function SocialBoard({ posts, labels }: { posts: SocialPost[]; labels: SocialLabels }) {
  const [filter, setFilter] = useState<SocialPlatform | null>(null);
  const visible = filter ? posts.filter((post) => post.platform === filter) : posts;

  const toggle = (platform: SocialPlatform) =>
    setFilter((current) => (current === platform ? null : platform));

  const filterButton = (platform: SocialPlatform, label: string, icon: React.ReactNode) => {
    const on = filter === null || filter === platform;
    const count = posts.filter((post) => post.platform === platform).length;
    return (
      <Button
        onClick={() => toggle(platform)}
        aria-pressed={filter === platform}
        variant={on ? 'contained' : 'outlined'}
        color="primary"
        size="small"
        startIcon={icon}
        disabled={count === 0}
        sx={{
          color: 'text.primary',
          borderColor: brand.ink12,
          '&.Mui-disabled': { color: brand.ink45 },
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <>
      <SectionHeading
        eyebrow={labels.eyebrow}
        title={labels.handle}
        action={
          <Stack direction="row" spacing={1.5} role="group" aria-label={labels.eyebrow}>
            {filterButton('instagram', labels.instagram, <InstagramIcon />)}
            {filterButton('tiktok', labels.tiktok, <TikTokIcon size={18} />)}
          </Stack>
        }
      />

      {visible.length === 0 ? (
        <Stack spacing={2} alignItems="flex-start" sx={{ py: 4 }}>
          <Typography color="text.secondary">{labels.empty}</Typography>
          <Button onClick={() => setFilter(null)} variant="outlined" size="small">
            {labels.showAll}
          </Button>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {visible.map((post) => (
            <Box
              key={post.id}
              component="a"
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={post.caption ? `${labels.viewPost}: ${post.caption}` : labels.viewPost}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                display: 'block',
                overflow: 'hidden',
                borderRadius: `${radius.md}px`,
                backgroundColor: brand.limewashTint,
                '&:hover img': { transform: 'scale(1.04)' },
              }}
            >
              <Image
                src={post.imageUrl}
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 25vw"
                style={{ objectFit: 'cover', transition: 'transform 400ms cubic-bezier(.16,1,.3,1)' }}
              />

              {post.isVideo ? (
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(26,26,26,.55)',
                    color: brand.white,
                  }}
                >
                  <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
              ) : null}

              {/* Scrim only under the caption: the photo is the point. */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto 0 0 0',
                  p: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  color: brand.white,
                  background:
                    'linear-gradient(to top, rgba(26,26,26,.72) 0%, rgba(26,26,26,.35) 55%, rgba(26,26,26,0) 100%)',
                }}
              >
                <Box aria-hidden sx={{ display: 'flex', opacity: 0.9, flexShrink: 0 }}>
                  {post.platform === 'tiktok' ? (
                    <TikTokIcon size={16} />
                  ) : (
                    <InstagramIcon sx={{ fontSize: 16 }} />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,.35)' }}
                >
                  {post.caption}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        {labels.note}
      </Typography>
    </>
  );
}
