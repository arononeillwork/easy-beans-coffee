import 'server-only';
import { monthLabel } from '../email/competitionEmails';
import type { EntryRow } from './drawRepo';

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(6, user.length - 1)))}@${domain}`;
}

/**
 * Instagram only lets a business message someone who has messaged it first,
 * so the winner's DM can't be sent automatically. This is the next best thing:
 * the message ready to copy and a button straight into their DMs. The card
 * number stays in the email, so a mistyped username never leaks it.
 */
export function dmText(winner: EntryRow, drawMonth: string): string {
  const name = winner.full_name.trim().split(/\s+/)[0];
  if (winner.lang === 'es') {
    return `¡Hola ${name}! 🎉 Has ganado nuestro sorteo de ${monthLabel(drawMonth, 'es')}: una tarjeta regalo de Easy Beans de 10 €. Te hemos enviado el número por email a ${maskEmail(winner.email)} (mira también en spam). ¡Hasta pronto! ☕`;
  }
  return `Hi ${name}! 🎉 You've won our ${monthLabel(drawMonth)} draw: a €10 Easy Beans gift card. We've emailed your card number to ${maskEmail(winner.email)} (check spam too). See you soon! ☕`;
}

