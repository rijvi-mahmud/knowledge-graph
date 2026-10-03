'use client';

import type { MouseEvent, ReactNode } from 'react';

/** Card surface with a soft brand light that follows the cursor. */
export function Spotlight({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  function track(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
  }

  return (
    <div onMouseMove={track} className={`group relative ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(280px circle at var(--x, 50%) var(--y, 50%), var(--color-brand-soft), transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}
