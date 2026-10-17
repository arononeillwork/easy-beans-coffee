import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isLang } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionary';
import { brand, radius } from '@/theme/brand';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.story.title,
    description: t.story.body,
    alternates: {
      canonical: `/${lang}/about`,
      languages: { es: '/es/about', en: '/en/about' },
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 9, md: 14 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: { xs: 5, md: 8 }, alignItems: 'end' }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Typography variant="h1" sx={{ fontSize: { xs: 'clamp(2.5rem, 11vw, 3.75rem)', md: 'clamp(3.75rem, 6vw, 5.75rem)' }, lineHeight: 0.98, letterSpacing: '-0.04em', maxWidth: '12ch' }}>
            {t.story.headline}
          </Typography>
          {t.story.paragraphs.map((p) => (
            <Typography key={p.slice(0, 24)} sx={{ fontSize: { xs: '1.0625rem', md: '1.1875rem' }, color: brand.ink70, maxWidth: '40ch' }}>
              {p}
            </Typography>
          ))}
        </Stack>
        <Box sx={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: `${radius.xl}px`, overflow: 'hidden' }}>
          <Image src="/media/terrace.webp" alt={t.story.photoAlt} fill priority sizes="(max-width: 900px) 100vw, 42vw" style={{ objectFit: 'cover' }} />
        </Box>
      </Box>
    </Container>
  );
}
