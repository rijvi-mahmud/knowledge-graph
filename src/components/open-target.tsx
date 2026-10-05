'use client';

import { useEffect } from 'react';

/**
 * Rules, decisions and other spec items are collapsible <details> rows. When
 * a link lands on one (#br-4), open it and scroll to it, so the reader sees
 * the item the link pointed at instead of a closed row.
 */
export function OpenTarget() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
        target.scrollIntoView({ block: 'start' });
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
