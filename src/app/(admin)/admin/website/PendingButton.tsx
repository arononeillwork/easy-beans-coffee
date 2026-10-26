'use client';

import { useFormStatus } from 'react-dom';

/**
 * A submit button that says what is happening while its form's server action
 * runs. Generating a site takes a minute or two, and without this the page
 * just looks stuck.
 */
export function PendingButton({
  label,
  pendingLabel,
  className = 'primary',
  name,
  value,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" name={name} value={value} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
