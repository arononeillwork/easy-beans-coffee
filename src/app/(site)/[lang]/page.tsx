import { notFound } from 'next/navigation';
import { HomeHero } from '@/components/home/HomeHero';
import { MenuBoard } from '@/components/home/MenuBoard';
import { CanBand } from '@/components/home/CanBand';
import { InstagramGrid } from '@/components/home/InstagramGrid';
import { VisitSection } from '@/components/home/VisitSection';
import { NewsletterStrip } from '@/components/home/NewsletterStrip';
import { isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getPlaceDetails } from '@/server/places/googlePlaces';
import { getOrderingHours } from '@/server/places/orderingHours';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';

/**
 * Six blocks, each carrying live data where it has any: open/closed from the
 * Google hours, prices from Square, posts from Instagram, rating from Google.
 * Copy is kept to what a visitor needs to act.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);
  const [place, ordering, prices] = await Promise.all([
    getPlaceDetails(lang),
    getOrderingHours(),
    getPriceBookOrEmpty(),
  ]);

  return (
    <>
      <HomeHero t={t} lang={lang} hours={ordering.hours} />
      <MenuBoard t={t} lang={lang} prices={prices} />
      <CanBand t={t} />
      <InstagramGrid t={t} />
      <VisitSection t={t} place={place} />
      <NewsletterStrip />
    </>
  );
}
