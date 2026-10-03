import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Lang } from '@/i18n/config';
import type { SiteContent } from '@/i18n/content/en';
import { getBusinessReviews } from '@/server/places/businessProfile';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { brand, radius } from '@/theme/brand';
import { Stars } from './Stars';
import { ReviewCarousel, type ReviewCard } from './client/ReviewCarousel';

const MAPS_FALLBACK =
  'https://www.google.com/maps/search/?api=1&query=Easy+Beans+Coffee+C.+Pizarro+8+San+Pedro+de+Alc%C3%A1ntara';

/** Our own photography, in the order `t.reviews.gallery` declares the captions. */
const GALLERY_PHOTOS = [
  '/media/terrace.webp',
  '/media/ube-latte.webp',
  '/media/acai-bowl.webp',
  '/media/dog-story.webp',
  '/media/iced-can-hand.webp',
  '/media/strawberry-matcha-can.webp',
];

/**
 * Live Google rating, then a row of photos with the words underneath.
 *
 * Server component: the Places key never reaches the browser, and the fetch is
 * cached for six hours so the page stays effectively static.
 *
 * The three pieces of the section degrade independently, because Google hands
 * them out independently — a listing can return a rating while withholding both
 * review text and photos (see `googlePlaces.ts`). So: the rating shows whenever
 * Google gives one; the cards carry real reviews when there are any and our own
 * captions when there are none; and the photos are Google's when it returns
 * them, ours otherwise. What never happens is an empty band, and what never
 * happens is a caption of ours dressed up as a customer quote.
 *
 * Review *text* has two possible sources, tried in that order: the café's own
 * Business Profile, which returns all of them, and the public Places listing,
 * which caps at five and is currently returning none at all. The two calls are
 * independent, so they run together rather than one after the other.
 */
export async function ReviewsSection({ t, lang }: { t: SiteContent; lang: Lang }) {
  const [place, ownReviews] = await Promise.all([getPlaceDetails(lang), getBusinessReviews(lang)]);
  const rating = place?.rating ?? null;

  const photos = place?.photos.length
    ? place.photos.map((photo) => ({
        src: photo.url,
        alt: t.reviews.photoAlt,
        credit: photo.attribution,
        creditUrl: photo.attributionUrl,
      }))
    : GALLERY_PHOTOS.map((src, i) => ({
        src,
        alt: t.reviews.gallery[i % t.reviews.gallery.length].alt,
        credit: null,
        creditUrl: null,
      }));

  const reviews = ownReviews.length ? ownReviews : (place?.reviews ?? []);

  const cards: ReviewCard[] = reviews.length
    ? reviews.map((review, i) => {
        const photo = photos[i % photos.length];
        return {
          id: review.id,
          photo: photo.src,
          alt: photo.alt,
          text: review.text,
          author: review.author,
          meta: [review.date, review.relative].filter(Boolean).join(' · ') || null,
          rating: review.rating || null,
          url: review.url ?? place?.reviewsUrl ?? null,
          credit: photo.credit,
          creditUrl: photo.creditUrl,
        };
      })
    : photos.map((photo, i) => ({
        id: `caption-${i}`,
        photo: photo.src,
        alt: photo.alt,
        // Google photos come with no words of ours to pair them with, so the
        // caption list is indexed defensively rather than assumed parallel.
        text: t.reviews.gallery[i % t.reviews.gallery.length].caption,
        author: null,
        meta: null,
        rating: null,
        url: null,
        credit: photo.credit,
        creditUrl: photo.creditUrl,
      }));

  return (
    <Box sx={{ backgroundColor: brand.rosePinkTint }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
          {t.reviews.eyebrow}
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2.5, sm: 3 }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          sx={{ pb: 2.5 }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="baseline">
              <Typography
                component="span"
                sx={{
                  fontFamily: 'var(--font-poppins)',
                  fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: rating ? brand.ink : brand.ink45,
                }}
              >
                {rating ? rating.toFixed(1) : '—'}
              </Typography>
              <Typography component="span" color="text.secondary">
                {t.reviews.outOf}
              </Typography>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Stars
                  value={rating}
                  size={22}
                  label={rating ? `${rating.toFixed(1)} / 5` : undefined}
                />
              </Box>
            </Stack>

            <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 1 }}>
              <Stars
                value={rating}
                size={20}
                label={rating ? `${rating.toFixed(1)} / 5` : undefined}
              />
            </Box>

            <Typography variant="body2" sx={{ mt: 1.5, color: brand.ink70 }}>
              {place?.total ? `${place.total} ${t.reviews.count}` : t.reviews.source}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button
              href={place?.reviewsUrl ?? MAPS_FALLBACK}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              sx={{ borderColor: brand.ink12, color: 'text.primary' }}
            >
              {t.reviews.readAll}
            </Button>
            <Button
              href={place?.writeReviewUrl ?? MAPS_FALLBACK}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
            >
              {t.reviews.leaveCta}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ height: '1px', backgroundColor: brand.rosePink, opacity: 0.55, mb: 4 }} />

        {rating ? null : (
          <Box
            sx={{
              mb: 3,
              p: 1.75,
              borderRadius: `${radius.md}px`,
              backgroundColor: brand.white,
              border: `1px dashed ${brand.rosePink}`,
            }}
          >
            <Typography variant="caption" sx={{ color: brand.ink70 }}>
              {t.reviews.placeholderNotice}
            </Typography>
          </Box>
        )}

        <ReviewCarousel
          cards={cards}
          prevLabel={t.reviews.prev}
          nextLabel={t.reviews.next}
          linkLabel={t.reviews.onGoogle}
          creditLabel={t.reviews.photoCredit}
        />
      </Container>
    </Box>
  );
}
