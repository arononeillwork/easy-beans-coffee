import type { Lang } from '@/i18n/config';

/** Competition copy lives with the feature: it is temporary and self-contained. */
const en = {
    metaTitle: 'Win €10 every month',
    metaDescription:
      'Follow @easy.beans.coffee and sign up for news & offers to enter our monthly €10 gift card draw.',
    posterAlt:
      'Win €10 on us, every month. 1: Follow @easy.beans.coffee. 2: Sign up for news & offers. Scan to enter.',
    formTitle: 'Enter the draw',
    formIntro: 'Two steps, thirty seconds. We draw one winner on the 15th of every month.',
    stepFollow: 'Follow us on Instagram',
    followCta: 'Open @easy.beans.coffee',
    stepSignup: 'Sign up for news & offers',
    name: 'Full name',
    email: 'Email',
    phone: 'Phone (optional)',
    instagram: 'Your Instagram handle',
    instagramHelp: 'So we can check you follow us if you win.',
    marketing:
      'Sign me up for Easy Beans news & offers by email. This is how you enter, and you can unsubscribe anytime.',
    termsBefore: 'I’m 18 or over and accept the ',
    termsLink: 'competition terms & privacy notice',
    submit: 'Enter the draw',
    sending: 'Entering…',
    doneTitle: 'You’re in! ☕',
    doneBody:
      'Good luck. We draw the winner on the 15th and will email you if it’s you. Make sure you’re following @easy.beans.coffee.',
    alreadyTitle: 'You’re already in this month’s draw',
    alreadyBody: 'One entry per person per month. Come back after the 15th for the next one.',
    errName: 'Please enter your name.',
    errEmail: 'Please enter a valid email.',
    errPhone: 'That doesn’t look like a phone number.',
    errInstagram: 'Please enter your Instagram handle (letters, numbers, dots, underscores).',
    errTicks: 'Please tick both boxes to enter.',
    errGeneric: 'Something went wrong. Please try again in a moment.',
    errRate: 'Too many attempts from this connection. Please try again later.',
};

const es: Record<keyof typeof en, string> = {
    metaTitle: 'Gana 10 € cada mes',
    metaDescription:
      'Sigue a @easy.beans.coffee y apúntate a novedades y ofertas para entrar en el sorteo mensual de una tarjeta regalo de 10 €.',
    posterAlt:
      'Gana 10 € cada mes. 1: Sigue a @easy.beans.coffee. 2: Apúntate a novedades y ofertas. Escanea para participar.',
    formTitle: 'Participa en el sorteo',
    formIntro: 'Dos pasos, treinta segundos. Sorteamos un ganador el día 15 de cada mes.',
    stepFollow: 'Síguenos en Instagram',
    followCta: 'Abrir @easy.beans.coffee',
    stepSignup: 'Apúntate a novedades y ofertas',
    name: 'Nombre y apellidos',
    email: 'Email',
    phone: 'Teléfono (opcional)',
    instagram: 'Tu usuario de Instagram',
    instagramHelp: 'Para comprobar que nos sigues si ganas.',
    marketing:
      'Quiero recibir por email novedades y ofertas de Easy Beans. Así participas, y puedes darte de baja cuando quieras.',
    termsBefore: 'Tengo 18 años o más y acepto las ',
    termsLink: 'bases del sorteo y el aviso de privacidad',
    submit: 'Participar',
    sending: 'Enviando…',
    doneTitle: '¡Ya participas! ☕',
    doneBody:
      'Suerte. Sorteamos el día 15 y te escribiremos por email si ganas. Asegúrate de seguir a @easy.beans.coffee.',
    alreadyTitle: 'Ya participas en el sorteo de este mes',
    alreadyBody: 'Una participación por persona y mes. Vuelve después del día 15 para el siguiente.',
    errName: 'Escribe tu nombre.',
    errEmail: 'Escribe un email válido.',
    errPhone: 'Ese teléfono no parece válido.',
    errInstagram: 'Escribe tu usuario de Instagram (letras, números, puntos y guiones bajos).',
    errTicks: 'Marca las dos casillas para participar.',
    errGeneric: 'Algo ha fallado. Inténtalo de nuevo en un momento.',
    errRate: 'Demasiados intentos desde esta conexión. Inténtalo más tarde.',
};

export type CompetitionCopy = Record<keyof typeof en, string>;

export function competitionCopy(lang: Lang): CompetitionCopy {
  return lang === 'es' ? es : en;
}
