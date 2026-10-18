'use client';

import { useFormStatus } from 'react-dom';

/**
 * Approving creates the Square card and sends two emails, which takes a few
 * seconds. Without feedback it looks like nothing happened and invites a
 * second press, so the button says what it is doing and can't be pressed twice.
 */
export function SubmitButton({ label, busy, kind }: { label: string; busy: string; kind: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={kind} type="submit" disabled={pending} aria-busy={pending} style={pending ? { opacity: 0.7, cursor: 'wait' } : undefined}>
      {pending ? busy : label}
    </button>
  );
}
