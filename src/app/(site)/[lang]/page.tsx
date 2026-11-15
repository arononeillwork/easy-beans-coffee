import { notFound } from 'next/navigation';
import { HomeHero } from '@/components/home/HomeHero';
import { MenuBoard } from '@/components/home/MenuBoard';
import { Ticker } from '@/components/home/Ticker';
import { CafeFilm } from '@/components/home/CafeFilm';
import { CanBand } from '@/components/home/CanBand';
import { InstagramGrid } from '@/components/home/InstagramGrid';
import { VisitSection } from '@/components/home/VisitSection';
import { isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { getCafeDetails } from '@/server/businessAgent/detailsFeed';
import { getCafeReviews } from '@/server/businessAgent/reviewsFeed';
import { getPriceBookOrEmpty } from '@/server/square/priceCache';

/**
 * Six blocks, each carrying live data where it has any, all of it from the
 * Business Agent (the café's back office): open/closed, the address and
 * WhatsApp, what's on the menu and its prices, the Instagram posts and the
 * Google rating. Copy is kept to what a visitor needs to act.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);
  const [reviews, prices, details] = await Promise.all([getCafeReviews(), getPriceBookOrEmpty(), getCafeDetails()]);

  return (
    <>
      <HomeHero t={t} lang={lang} />
      <Ticker t={t} />
      <MenuBoard t={t} lang={lang} prices={prices} />
      <CafeFilm t={t} />
      <CanBand t={t} />
      <InstagramGrid t={t} />
      <VisitSection t={t} lang={lang} reviews={reviews} details={details} />
    </>
  );
}
