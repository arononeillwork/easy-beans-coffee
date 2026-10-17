'use client';

import { useState } from 'react';

/** Copies the ready-made DM so the owner only has to paste it in Instagram. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="light"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* select the text box by hand instead */
        }
      }}
    >
      {copied ? 'Copied ✓' : 'Copy message'}
    </button>
  );
}
