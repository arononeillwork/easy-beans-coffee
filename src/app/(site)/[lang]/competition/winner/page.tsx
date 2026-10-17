import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { isLang, type Lang } from '@/i18n/config';
import { brand, radius } from '@/theme/brand';
import { getDrawByToken } from '@/server/competition/drawRepo';
import { recordInstagramConsent } from '@/server/competition/drawFlow';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Easy Beans', robots: { index: false, follow: false } };

/**
 * Where the winner's "can we tag you on Instagram?" buttons land. The email
 * links only open this page; the answer is recorded by the button here, so a
 * mail scanner following the link can't answer on the winner's behalf.
 */

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    q: 'Can we congratulate you on our Instagram?',
    body: 'We’d post a celebration and tag your account. If you’d rather not, we’ll post without your name.',
    yes: 'Yes, tag me',
    no: 'No thanks',
    thanksYes: 'Thank you! Look out for the post on @easy.beans.coffee ☕',
    thanksNo: 'No problem — we won’t use your name. Enjoy your €10 ☕',
    invalid: 'This link is not valid any more.',
    answered: 'Thanks, we already have your answer.',
  },
  es: {
    q: '¿Podemos felicitarte en nuestro Instagram?',
    body: 'Publicaríamos una felicitación etiquetando tu cuenta. Si prefieres que no, publicaremos sin tu nombre.',
    yes: 'Sí, etiquétame',
    no: 'No, gracias',
    thanksYes: '¡Gracias! Busca la publicación en @easy.beans.coffee ☕',
    thanksNo: 'Sin problema, no usaremos tu nombre. ¡Disfruta tus 10 € ☕',
    invalid: 'Este enlace ya no es válido.',
    answered: 'Gracias, ya tenemos tu respuesta.',
  },
};

async function answer(formData: FormData) {
  'use server';
  const t = String(formData.get('t') ?? '');
  const lang = formData.get('lang') === 'es' ? 'es' : 'en';
  const yes = formData.get('a') === 'yes';
  await recordInstagramConsent(t, yes);
  redirect(`/${lang}/competition/winner?t=${encodeURIComponent(t)}&done=${yes ? 'yes' : 'no'}`);
}

export default async function WinnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ t?: string; a?: string; done?: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = COPY[lang];
  const { t, a, done } = await searchParams;
  const draw = typeof t === 'string' ? await getDrawByToken('winner', t) : null;

  let content: React.ReactNode;
  if (!draw || draw.status !== 'approved') {
    content = <Typography>{c.invalid}</Typography>;
  } else if (done === 'yes' || done === 'no') {
    content = <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, color: '#3B2A20' }}>{done === 'yes' ? c.thanksYes : c.thanksNo}</Typography>;
  } else if (draw.ig_consent !== null) {
    content = <Typography>{c.answered}</Typography>;
  } else {
    const btn = (value: 'yes' | 'no', label: string, primary: boolean) => (
      <form action={answer} style={{ display: 'inline-block', margin: '8px 8px 0 0' }}>
        <input type="hidden" name="t" value={draw.winner_token} />
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="a" value={value} />
        <button
          type="submit"
          style={{
            border: 0,
            borderRadius: 999,
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            background: primary ? '#3B2A20' : brand.roseWash,
            color: primary ? brand.cream : '#3B2A20',
            outline: a === value ? `3px solid ${brand.rosePink}` : 'none',
            outlineOffset: 3,
          }}
        >
          {label}
        </button>
      </form>
    );
    content = (
      <>
        <Typography variant="h4" component="h1" sx={{ color: '#3B2A20', fontWeight: 600 }}>
          {c.q}
        </Typography>
        <Typography sx={{ mt: 1.5, color: brand.ink70 }}>{c.body}</Typography>
        <Box sx={{ mt: 2 }}>
          {btn('yes', c.yes, true)}
          {btn('no', c.no, false)}
        </Box>
      </>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Box sx={{ backgroundColor: brand.white, borderRadius: `${radius.xl}px`, p: { xs: 3, sm: 5 } }}>{content}</Box>
    </Container>
  );
}
