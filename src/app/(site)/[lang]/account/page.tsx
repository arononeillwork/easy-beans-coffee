import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { AccountView } from '@/features/account/client/AccountView';

/**
 * The account page shell. The page itself is static — who is signed in is a
 * cookie the *client* presents to /api/account, so nothing personal is ever
 * in the prerendered HTML, and both locales build at deploy time like every
 * other page.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.account.title,
    description: t.account.signInBody,
    // A sign-in page is nothing for a search index.
    robots: { index: false },
    alternates: {
      canonical: `/${lang}/account`,
      languages: { es: '/es/account', en: '/en/account' },
    },
  };
}

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <AccountView />;
}
