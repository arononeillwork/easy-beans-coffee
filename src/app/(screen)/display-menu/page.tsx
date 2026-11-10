/**
 * The in-café TV (easybeanscoffee.com/display-menu), turned vertical. It shows
 * one Instagram post, whole, with the handle under it, upright even when the
 * TV still sends the browser a landscape picture (see Poster).
 *
 * For now that is the cake + coffee €7 post (PINNED_POST), kept as a file of
 * the site's own so the screen never waits on Instagram. The TV reloads itself
 * when the picture changes (ReloadOnChange), so a new picture here reaches the
 * screen within a minute of the deploy, without anyone touching the TV.
 *
 * With SHOW_NEWEST_POST on, it follows the café's newest Instagram post
 * instead: the page asks Instagram for it every couple of minutes, and the
 * picture comes through the site's own address for it (media/display/[file]),
 * which stays put while Instagram's own expires. If Instagram stops answering,
 * the screen keeps the post it already has: the read throws, and Next keeps
 * serving the last good page. With no Instagram token at all it shows the
 * coffee + Chia Seed Parfait offer poster.
 *
 * The menu board (features/menu/display/DisplayBoard) is kept for when the
 * screen goes back to the menu.
 */
import { getLatestInstagramPost } from '@/server/social/instagram';
import { brand } from '@/theme/brand';
import { Poster } from './Poster';
import { ReloadOnChange } from './ReloadOnChange';

/** Seconds between asks for a newer post. */
export const revalidate = 120;

/**
 * Whether the TV follows the newest Instagram post by itself. Off: it shows
 * PINNED_POST and nothing posted later replaces it. Turning it back on is
 * this one line.
 */
const SHOW_NEWEST_POST = false;

/** What the TV shows while SHOW_NEWEST_POST is off: the cake + coffee €7 post of 5 November 2026. */
const PINNED_POST = {
  src: '/media/display/cake-coffee-offer.jpg',
  alt: 'Cake + coffee for just €7: a slice of Berry Cheesecake or Tarta de la Abuela with a coffee',
};

const FALLBACK_POSTER = '/media/display/chia-parfait-offer-en-upright.jpg';

const INSTAGRAM_HANDLE = '@easy.beans.coffee';

export default async function DisplayMenuPage() {
  const shown = SHOW_NEWEST_POST ? await newestPost() : PINNED_POST;
  const src = shown?.src ?? FALLBACK_POSTER;

  return (
    <main style={{ position: 'fixed', inset: 0, background: brand.cream, overflow: 'hidden' }}>
      {shown ? (
        <Poster src={src} alt={shown.alt} post>
          <Handle />
        </Poster>
      ) : (
        <Poster src={src} alt="Special offer: buy any coffee and get a Chia Seed Parfait for only €3 extra" />
      )}
      <ReloadOnChange poster={src} />
    </main>
  );
}

/** The newest Instagram post's picture, through the site's own address for it; null: none to show. */
async function newestPost() {
  const post = await latestPost();
  return post
    ? { src: `/media/display/instagram-${post.mediaId}.jpg`, alt: post.caption || `Our latest post on Instagram, ${INSTAGRAM_HANDLE}` }
    : null;
}

async function latestPost() {
  try {
    return await getLatestInstagramPost(revalidate);
  } catch (error) {
    // While the site is being built there is no earlier page to keep, and a
    // deploy must not wait on Instagram: the poster it is.
    if (process.env.NEXT_PHASE === 'phase-production-build') return null;
    throw error;
  }
}

/** Where the picture comes from, signed off like the printed menus. */
function Handle() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(var(--u) * 2)',
        padding: 'calc(var(--u) * 1.8) calc(var(--u) * 4.5)',
        borderRadius: 999,
        background: 'rgba(255, 255, 255, 0.92)',
        color: '#3B2A20',
        fontFamily: 'var(--font-poppins), sans-serif',
        fontWeight: 600,
        fontSize: 'calc(var(--u) * 4.6)',
        lineHeight: 1,
        letterSpacing: '-0.01em',
        boxShadow: '0 calc(var(--u) * 0.8) calc(var(--u) * 3) rgba(59, 42, 32, 0.18)',
      }}
    >
      <InstagramGlyph />
      {INSTAGRAM_HANDLE}
    </div>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: '1.15em', height: '1.15em', flex: 'none' }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke={brand.rosePinkDeep} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.3" fill="none" stroke={brand.rosePinkDeep} strokeWidth="2.2" />
      <circle cx="17.4" cy="6.6" r="1.4" fill={brand.rosePinkDeep} />
    </svg>
  );
}
