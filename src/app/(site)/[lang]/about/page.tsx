import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
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
    title: t.story.eyebrow,
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
    <>
      <Box sx={{ backgroundColor: brand.roseWash }}>
        <Container maxWidth="md" sx={{ py: { xs: 10, md: 14 } }}>
          <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 2 }}>
            {t.story.eyebrow}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', textWrap: 'balance' }}>
            {t.story.headline}
          </Typography>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: { xs: 7, md: 10 } }}>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '16 / 10',
            overflow: 'hidden',
            mb: 5,
            borderRadius: `${radius.lg}px`,
          }}
        >
          <Image
            src="/media/terrace.webp"
            alt="The Easy Beans terrace on Calle Pizarro"
            fill
            sizes="(max-width: 900px) 100vw, 900px"
            style={{ objectFit: 'cover', objectPosition: 'center 60%' }}
          />
        </Box>
        <Container maxWidth="sm" disableGutters>
          {t.story.paragraphs.map((p) => (
            <Typography key={p.slice(0, 24)} sx={{ mb: 3, fontSize: '1.05rem' }}>
              {p}
            </Typography>
          ))}
        </Container>
      </Container>
    </>
  );
}
