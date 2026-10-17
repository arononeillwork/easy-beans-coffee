import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { isLang } from '@/i18n/config';
import { brand, radius } from '@/theme/brand';
import { CompetitionPoster } from '@/features/competition/CompetitionPoster';
import { CompetitionForm } from '@/features/competition/CompetitionForm';
import { competitionCopy } from '@/features/competition/copy';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const c = competitionCopy(lang);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `/${lang}/competition`,
      languages: { es: '/es/competition', en: '/en/competition' },
    },
  };
}

export default async function CompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { src } = await searchParams;

  return (
    <Box sx={{ backgroundColor: brand.cream }}>
      <CompetitionPoster lang={lang} />

      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Box
          id="enter"
          sx={{
            backgroundColor: brand.white,
            borderRadius: `${radius.xl}px`,
            p: { xs: 2.5, sm: 4 },
            boxShadow: '0 10px 30px rgba(59, 42, 32, 0.08)',
          }}
        >
          <CompetitionForm lang={lang} src={typeof src === 'string' ? src.slice(0, 40) : undefined} />
        </Box>
      </Container>
    </Box>
  );
}
