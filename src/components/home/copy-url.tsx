'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies an absolute URL for a site path - the one thing an assistant needs. */
export function CopyUrl({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context, permissions) - the path
      // stays visible on the button, so the user can still copy it by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-3 rounded-full border border-fd-border bg-fd-background/80 py-1.5 pr-1.5 pl-4 text-sm backdrop-blur transition-colors duration-150 hover:border-fd-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring"
    >
      <span className="text-fd-muted-foreground">{label}</span>
      <span className="font-code text-xs">{path}</span>
      <span
        className={`grid size-7 place-items-center rounded-full transition-colors duration-150 ${
          copied
            ? 'bg-fd-primary text-fd-primary-foreground'
            : 'bg-fd-muted text-fd-muted-foreground'
        }`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
