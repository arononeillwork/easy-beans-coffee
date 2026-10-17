import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isLang, localePath, type Lang } from '@/i18n/config';
import { brand } from '@/theme/brand';

const ORGANISER = 'EASY BEANS COFFEE SL (NIF B27576347), C. Pizarro 8, 29670 San Pedro de Alcántara, Málaga';
const CONTACT = 'easybeanscafe@gmail.com';

type Section = { h: string; p: string[] };

const content: Record<Lang, { title: string; updated: string; back: string; sections: Section[] }> = {
  en: {
    title: 'Monthly €10 draw: terms & privacy',
    updated: 'Last updated 17 October 2026',
    back: '← Back to the competition',
    sections: [
      { h: '1. Organiser', p: [`The draw is run by ${ORGANISER}. Questions: ${CONTACT}.`] },
      {
        h: '2. Who can enter',
        p: [
          'Anyone aged 18 or over. Employees of Easy Beans Coffee and their immediate families cannot enter.',
          'Entry is free. No purchase is necessary.',
        ],
      },
      {
        h: '3. How to enter',
        p: [
          'Follow @easy.beans.coffee on Instagram, then complete the entry form at easybeanscoffee.com/competition with your name, email and Instagram handle, ticking the boxes to sign up for Easy Beans news & offers and to accept these terms.',
          'One entry per person (per email address) per monthly draw. Duplicate or automated entries are not counted.',
        ],
      },
      {
        h: '4. Draw dates',
        p: [
          'The draw runs every month until further notice, starting with the draw on 15 November 2026.',
          'Entries received up to 23:59 (Madrid time) on the 15th go into that month’s draw; entries from the 16th go into the next month’s. One winner is picked at random on or shortly after the 15th.',
        ],
      },
      {
        h: '5. The prize',
        p: [
          'One €10 Easy Beans digital gift card per draw, redeemable in the café at C. Pizarro 8, San Pedro de Alcántara, subject to Square’s gift card terms.',
          'The prize has no cash alternative and cannot be exchanged or transferred.',
        ],
      },
      {
        h: '6. Winner',
        p: [
          'We check that the winner follows @easy.beans.coffee at the time of the draw. If not, or if the entry breaks these terms, another entry is drawn.',
          'We email the winner. If they do not reply within 14 days, we may draw again. With the winner’s permission, we may share their first name and Instagram handle on our Instagram.',
        ],
      },
      {
        h: '7. Instagram',
        p: ['This promotion is in no way sponsored, endorsed or administered by, or associated with, Instagram or Meta.'],
      },
      {
        h: '8. Privacy notice',
        p: [
          `Controller: ${ORGANISER}. Contact: ${CONTACT}.`,
          'What we collect: your name, email, Instagram handle, optional phone number, and the date and technical details of your consent.',
          'Why: to run the draw and contact the winner, and to send you Easy Beans news & offers by email, which you asked for when entering. Legal basis: your consent (GDPR art. 6.1.a) and the running of this promotion (art. 6.1.b).',
          'How long: competition entries are kept for 12 months after the draw; your newsletter subscription lasts until you unsubscribe.',
          'Who sees it: only Easy Beans. Our providers (website hosting and database) process it on our behalf within the EU or under EU-approved safeguards. We never sell your data.',
          `Your rights: access, correct, delete, restrict or object, data portability, and withdrawing consent at any time — use the unsubscribe link in any email or write to ${CONTACT}. You can also complain to the Agencia Española de Protección de Datos (aepd.es).`,
        ],
      },
      {
        h: '9. General',
        p: [
          'We may change, pause or end the draw if needed, with notice on this page. Entering means accepting these terms. Spanish law applies.',
        ],
      },
    ],
  },
  es: {
    title: 'Sorteo mensual de 10 €: bases y privacidad',
    updated: 'Última actualización: 17 de octubre de 2026',
    back: '← Volver al sorteo',
    sections: [
      { h: '1. Organizador', p: [`Organiza el sorteo ${ORGANISER}. Dudas: ${CONTACT}.`] },
      {
        h: '2. Quién puede participar',
        p: [
          'Mayores de 18 años. No pueden participar los empleados de Easy Beans Coffee ni sus familiares directos.',
          'La participación es gratuita y no requiere compra.',
        ],
      },
      {
        h: '3. Cómo participar',
        p: [
          'Sigue a @easy.beans.coffee en Instagram y completa el formulario en easybeanscoffee.com/competition con tu nombre, email y usuario de Instagram, marcando las casillas para recibir novedades y ofertas de Easy Beans y para aceptar estas bases.',
          'Una participación por persona (por email) y sorteo mensual. No se tienen en cuenta participaciones duplicadas o automatizadas.',
        ],
      },
      {
        h: '4. Fechas',
        p: [
          'El sorteo se celebra cada mes hasta nuevo aviso, empezando por el del 15 de noviembre de 2026.',
          'Las participaciones recibidas hasta las 23:59 (hora de Madrid) del día 15 entran en el sorteo de ese mes; desde el día 16, en el del mes siguiente. Se elige un ganador al azar el día 15 o poco después.',
        ],
      },
      {
        h: '5. Premio',
        p: [
          'Una tarjeta regalo digital de Easy Beans de 10 € por sorteo, canjeable en la cafetería de C. Pizarro 8, San Pedro de Alcántara, según las condiciones de las tarjetas regalo de Square.',
          'El premio no puede cambiarse por dinero ni transferirse.',
        ],
      },
      {
        h: '6. Ganador',
        p: [
          'Comprobamos que el ganador sigue a @easy.beans.coffee en el momento del sorteo. Si no es así, o la participación incumple estas bases, se elige otra.',
          'Avisamos al ganador por email. Si no responde en 14 días, podemos volver a sortear. Con su permiso, podemos publicar su nombre y usuario de Instagram en nuestro Instagram.',
        ],
      },
      {
        h: '7. Instagram',
        p: ['Esta promoción no está patrocinada, avalada ni administrada por Instagram o Meta, ni asociada a ellas.'],
      },
      {
        h: '8. Aviso de privacidad',
        p: [
          `Responsable: ${ORGANISER}. Contacto: ${CONTACT}.`,
          'Qué datos: nombre, email, usuario de Instagram, teléfono (opcional) y la fecha y datos técnicos de tu consentimiento.',
          'Para qué: gestionar el sorteo y contactar con el ganador, y enviarte por email novedades y ofertas de Easy Beans, que solicitaste al participar. Base legal: tu consentimiento (art. 6.1.a RGPD) y la gestión de esta promoción (art. 6.1.b).',
          'Cuánto tiempo: las participaciones se guardan 12 meses tras el sorteo; la suscripción, hasta que te des de baja.',
          'Quién los ve: solo Easy Beans. Nuestros proveedores (alojamiento web y base de datos) los tratan por nuestra cuenta en la UE o con garantías aprobadas por la UE. Nunca vendemos tus datos.',
          `Tus derechos: acceso, rectificación, supresión, limitación, oposición, portabilidad y retirar tu consentimiento cuando quieras — con el enlace de baja de cualquier email o escribiendo a ${CONTACT}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`,
        ],
      },
      {
        h: '9. General',
        p: [
          'Podemos modificar, pausar o terminar el sorteo si es necesario, avisando en esta página. Participar supone aceptar estas bases. Se rige por la ley española.',
        ],
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    title: content[lang].title,
    alternates: {
      canonical: `/${lang}/competition-terms`,
      languages: { es: '/es/competition-terms', en: '/en/competition-terms' },
    },
  };
}

export default async function CompetitionTermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = content[lang];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Link href={localePath(lang, '/competition')} style={{ color: '#3B2A20', fontWeight: 600 }}>
        {t.back}
      </Link>
      <Typography variant="h2" component="h1" sx={{ mt: 3, color: '#3B2A20', fontSize: { xs: '2rem', md: '2.75rem' } }}>
        {t.title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: brand.ink45 }}>
        {t.updated}
      </Typography>
      <Stack spacing={3.5} sx={{ mt: 4 }}>
        {t.sections.map((s) => (
          <section key={s.h}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: '#3B2A20' }}>
              {s.h}
            </Typography>
            {s.p.map((p) => (
              <Typography key={p.slice(0, 30)} sx={{ mt: 1, color: brand.ink70, lineHeight: 1.7 }}>
                {p}
              </Typography>
            ))}
          </section>
        ))}
      </Stack>
    </Container>
  );
}
