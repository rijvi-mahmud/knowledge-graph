'use client';

import { usePathname, useRouter } from 'next/navigation';
import { JURISDICTION_COOKIE } from '@/lib/jurisdictions';

const OPTIONS = [
  { value: 'all', label: 'All jurisdictions' },
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'European Union' },
];

/**
 * Shows only the items that apply in one jurisdiction. The choice is kept in a
 * cookie so it follows the reader across spec pages; the proxy reads it.
 */
export function JurisdictionSelect({ current }: { current?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="ms-auto flex items-center gap-2 text-sm text-fd-muted-foreground">
      Jurisdiction
      <select
        className="rounded-md border bg-fd-background px-2 py-1 text-fd-foreground"
        value={current ?? 'all'}
        onChange={(e) => {
          const value = e.target.value;
          document.cookie =
            value === 'all'
              ? `${JURISDICTION_COOKIE}=; path=/; max-age=0`
              : `${JURISDICTION_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
          router.replace(`${pathname}?jurisdiction=${value}`);
          router.refresh();
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
