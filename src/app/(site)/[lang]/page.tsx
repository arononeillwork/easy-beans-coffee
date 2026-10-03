import { notFound } from 'next/navigation';
import { Hero } from '@/components/marketing/Hero';
import { UspTicker } from '@/components/marketing/UspTicker';
import { StorySection } from '@/components/marketing/StorySection';
import { VideoSection } from '@/components/marketing/VideoSection';
import { DrinkCardsSection } from '@/components/marketing/DrinkCardsSection';
import { CanSection } from '@/components/marketing/CanSection';
import { DrinksEducation } from '@/components/marketing/DrinksEducation';
import { SocialFeed } from '@/components/marketing/SocialFeed';
import { ReviewsSection } from '@/components/marketing/ReviewsSection';
import { NewsletterSection } from '@/components/marketing/NewsletterSection';
import { LocationSection } from '@/components/marketing/LocationSection';
import { isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';

/**
 * Section order follows the brand's band alternation: cream grounds carry the
 * copy, rose tints mark the two moments we want remembered (the can, the list).
 *
 * Every section but the newsletter is a server component, so the whole page
 * prerenders to HTML per locale and the browser gets no JS for the copy.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <Hero t={t} lang={lang} />
      <UspTicker t={t} />
      <StorySection t={t} lang={lang} />
      <VideoSection t={t} />
      <DrinkCardsSection t={t} lang={lang} />
      <CanSection t={t} lang={lang} />
      <DrinksEducation t={t} lang={lang} />
      <SocialFeed t={t} />
      <ReviewsSection t={t} lang={lang} />
      <NewsletterSection />
      <LocationSection t={t} />
    </>
  );
}
